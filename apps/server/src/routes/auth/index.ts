import { FastifyPluginAsync } from 'fastify'
import axios from 'axios'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { config } from '../../lib/config.js'
import { UserPayload } from '../../plugins/jwt.js'

/**
 * 认证路由
 * 
 * 处理 GitHub OAuth 流程：
 * 1. /github - 重定向到 GitHub 授权页面
 * 2. /github/callback - 处理 GitHub 回调，创建/更新用户，返回 JWT
 * 3. /me - 返回当前认证用户信息
 */
const auth: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>()
  const githubLoginQuerySchema = z.object({
    state: z.string().trim().min(16).max(200),
  })

  const githubCallbackQuerySchema = z.object({
    code: z.string().trim().min(1),
    state: z.string().trim().min(16).max(200),
  })
  
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
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', config.GITHUB_CLIENT_ID)
    url.searchParams.set('redirect_uri', config.GITHUB_CALLBACK_URL)
    url.searchParams.set('scope', 'user:email')
    url.searchParams.set('state', request.query.state)
    
    return reply.redirect(url.toString())
    },
  )

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
    const { code } = request.query

    try {
      // 用 code 交换 access token
      const tokenRes = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: config.GITHUB_CALLBACK_URL,
        },
        {
          headers: { Accept: 'application/json' },
        }
      )

      const accessToken = tokenRes.data.access_token

      if (!accessToken) {
        return reply.code(400).send({ error: '获取访问令牌失败' })
      }

      // 从 GitHub API 获取用户信息
      const userRes = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `token ${accessToken}` },
      })

      const githubUser = userRes.data

      // 查找或创建用户
      let user = await fastify.prisma.user.findUnique({
        where: { githubId: String(githubUser.id) },
      })

      if (!user) {
        user = await fastify.prisma.user.create({
          data: {
            githubId: String(githubUser.id),
            username: githubUser.login,
            avatar: githubUser.avatar_url,
            email: githubUser.email,
          },
        })
      }

      // 生成 JWT 令牌
      const token = fastify.jwt.sign({
        userId: user.id,
        githubId: user.githubId,
        username: user.username,
      })

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          email: user.email,
        },
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: '认证失败' })
    }
    },
  )

  /**
   * GET /me
   * 获取当前认证用户信息
   * 需要 JWT 认证
   */
  fastify.get('/me', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload

    const user = await fastify.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
        email: true,
        createdAt: true,
      },
    })

    if (!user) {
      return reply.code(404).send({ error: '用户不存在' })
    }

    return { user }
  })
}

export default auth
