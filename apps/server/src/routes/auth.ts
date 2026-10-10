import { randomBytes, timingSafeEqual } from 'node:crypto';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SignJWT } from 'jose';
import { userSchema } from '@litetrack/contracts';
import {
  authenticate,
  fail,
  success,
  response,
  type Dependencies,
  type Env,
} from '../lib/http.js';

const githubToken = z.object({ access_token: z.string().min(1) });
const githubUser = z.object({
  id: z.number().int().positive(),
  login: z.string(),
  avatar_url: z.string().optional(),
});
export function authRoutes({ db, redis, config }: Dependencies) {
  const app = new OpenAPIHono<Env>();
  const cookieOptions = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'Lax' as const,
    path: '/',
  };
  app.get('/github', async (c) => {
    if (!config.GITHUB_CLIENT_ID || !config.GITHUB_CLIENT_SECRET)
      fail(503, '尚未配置 GitHub 登录');
    const state = randomBytes(32).toString('hex');
    await redis.set('oauth:' + state, '1', 'EX', 300);
    setCookie(c, 'lt_oauth', state, { ...cookieOptions, maxAge: 300 });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', config.GITHUB_CLIENT_ID);
    url.searchParams.set(
      'redirect_uri',
      config.PUBLIC_URL + '/litetrack/api/auth/github/callback',
    );
    url.searchParams.set('state', state);
    return c.redirect(url.toString());
  });
  app.get('/github/callback', async (c) => {
    const state = c.req.query('state') || '';
    const cookie = getCookie(c, 'lt_oauth') || '';
    deleteCookie(c, 'lt_oauth', { path: '/' });
    if (
      !/^[a-f0-9]{64}$/.test(state) ||
      !/^[a-f0-9]{64}$/.test(cookie) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(cookie))
    )
      fail(400, '登录验证已过期，请重新登录');
    const stored = await redis.getdel('oauth:' + state);
    if (!stored) fail(400, '登录验证已过期，请重新登录');
    const code = c.req.query('code');
    if (!code || code.length > 500) fail(400, '授权码无效');
    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: config.GITHUB_CLIENT_ID,
          client_secret: config.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri:
            config.PUBLIC_URL + '/litetrack/api/auth/github/callback',
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!tokenResponse.ok) fail(503, 'GitHub 登录暂不可用');
    const token = githubToken.safeParse(await tokenResponse.json());
    if (!token.success) fail(400, 'GitHub 授权失败，请重新登录');
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: 'Bearer ' + token.data.access_token,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!userResponse.ok) fail(503, 'GitHub 用户信息暂不可用');
    const parsedUser = githubUser.safeParse(await userResponse.json());
    if (!parsedUser.success) fail(503, 'GitHub 用户信息无效');
    const github = parsedUser.data;
    const user = await db.user.upsert({
      where: { githubId: String(github.id) },
      create: {
        githubId: String(github.id),
        username: github.login,
        avatar: github.avatar_url,
      },
      update: { username: github.login, avatar: github.avatar_url },
    });
    const jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(user.id))
      .setIssuer('litetrack')
      .setAudience('admin')
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(new TextEncoder().encode(config.JWT_SECRET));
    setCookie(c, 'lt_session', jwt, { ...cookieOptions, maxAge: 30 * 86400 });
    return c.redirect(config.PUBLIC_URL + '/');
  });
  app.use('/me', authenticate(config));
  app.openapi(
    createRoute({
      method: 'get',
      path: '/me',
      responses: response(userSchema),
    }),
    async (c) => {
      const user = await db.user.findUnique({
        where: { id: c.get('userId') },
        select: { id: true, username: true, avatar: true },
      });
      if (!user) fail(401, '用户不存在，请重新登录');
      return success(c, user);
    },
  );
  app.use('/logout', authenticate(config));
  app.openapi(
    createRoute({
      method: 'post',
      path: '/logout',
      responses: response(z.null()),
    }),
    (c) => {
      deleteCookie(c, 'lt_session', { path: '/' });
      return success(c, null);
    },
  );
  return app;
}
