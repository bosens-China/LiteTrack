import { FastifyPluginAsync } from 'fastify';
import axios from 'axios';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { config } from '../../../lib/config.js';
import { UserPayload } from '../../../plugins/jwt.js';

/**
 * 认证路由
 *
 * 处理 GitHub OAuth 流程：
 * 1. /github - 重定向到 GitHub 授权页面
 * 2. /github/callback - 处理 GitHub 回调，创建/更新用户，返回 JWT
 * 3. /me - 返回当前认证用户信息
 */
const auth: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>();
  const githubLoginQuerySchema = z.object({
    state: z.string().trim().min(16).max(200),
  });

  const githubCallbackQuerySchema = z.object({
    code: z.string().trim().min(1),
    state: z.string().trim().min(16).max(200),
  });

  /**
   * GET /github
   * 重定向到 GitHub OAuth 授权页面
   */
  typed.get(
    '/github',
    {
      schema: {
        querystring: githubLoginQuerySchema,
      },
    },
    async (request, reply) => {
      const { state } = request.query;
      // 将 state 存入 Redis，5 分钟有效，回调时一次性核销
      await fastify.redis.setex(`oauth:state:${state}`, 300, '1');

      const url = new URL('https://github.com/login/oauth/authorize');
      url.searchParams.set('client_id', config.GITHUB_CLIENT_ID);
      url.searchParams.set('redirect_uri', config.GITHUB_CALLBACK_URL);
      url.searchParams.set('scope', 'user:email');
      url.searchParams.set('state', state);

      return reply.redirect(url.toString());
    },
  );

  /**
   * GET /github/callback
   * GitHub OAuth 回调处理
   * 交换 code 获取 access token，获取用户信息，生成 JWT
   */
  typed.get(
    '/github/callback',
    {
      schema: {
        querystring: githubCallbackQuerySchema,
      },
    },
    async (request, reply) => {
      const { code, state } = request.query;

      // 一次性核销 state：读取并删除，防止重放攻击
      const stateValue = await fastify.redis.get(`oauth:state:${state}`);
      if (!stateValue) {
        return reply
          .code(400)
          .send({ error: 'OAuth state 无效或已过期，请重新登录' });
      }
      await fastify.redis.del(`oauth:state:${state}`);

      try {
        const tokenRes = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: config.GITHUB_CLIENT_ID,
            client_secret: config.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: config.GITHUB_CALLBACK_URL,
          },
          { headers: { Accept: 'application/json' } },
        );

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
          return reply.code(400).send({ error: '获取访问令牌失败' });
        }

        const userRes = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `token ${accessToken}` },
        });
        const githubUser = userRes.data;

        let user = await fastify.prisma.user.findUnique({
          where: { githubId: String(githubUser.id) },
        });

        if (!user) {
          user = await fastify.prisma.user.create({
            data: {
              githubId: String(githubUser.id),
              username: githubUser.login,
              avatar: githubUser.avatar_url,
              email: githubUser.email,
            },
          });
        }

        const token = fastify.jwt.sign({
          userId: user.id,
          githubId: user.githubId,
          username: user.username,
        });

        return {
          token,
          user: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            email: user.email,
          },
        };
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: '认证失败' });
      }
    },
  );

  /**
   * GET /me
   * 获取当前认证用户信息
   * 需要 JWT 认证
   */
  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.user as UserPayload;

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          avatar: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: '用户不存在' });
      }

      return { user };
    },
  );
};

export default auth;
