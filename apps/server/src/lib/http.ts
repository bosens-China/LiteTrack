import type { Context, MiddlewareHandler } from 'hono';
import type { HttpBindings } from '@hono/node-server';
import { HTTPException } from 'hono/http-exception';
import { getCookie } from 'hono/cookie';
import { jwtVerify } from 'jose';
import proxyaddr from 'proxy-addr';
import { z } from 'zod';
import { envelopeSchema } from '@litetrack/contracts';
import type { Config } from './config.js';
import type { Resources } from './resources.js';

export type Env = { Bindings: HttpBindings; Variables: { userId: number } };
export type AppContext = Context<Env>;
export type Dependencies = Resources & { config: Config };
export const success = <T>(c: AppContext, data: T) =>
  c.json({ data, message: '成功', code: 'OK' }, 200);
export const response = <T extends z.ZodType>(data: T) => ({
  200: {
    description: '成功',
    content: { 'application/json': { schema: envelopeSchema(data) } },
  },
});
export function fail(
  status: 400 | 401 | 403 | 404 | 409 | 429 | 503,
  message: string,
): never {
  throw new HTTPException(status, { message });
}
export async function ownedSite(c: AppContext, db: Resources['db']) {
  const id = z.coerce
    .number()
    .int()
    .positive()
    .max(2147483647)
    .safeParse(c.req.param('id'));
  if (!id.success) fail(400, '站点编号无效');
  const site = await db.site.findFirst({
    where: { id: id.data, userId: c.get('userId') },
  });
  if (!site) fail(404, '站点不存在');
  return site;
}
export const authenticate =
  (config: Config): MiddlewareHandler<Env> =>
  async (c, next) => {
    const token = getCookie(c, 'lt_session');
    if (!token) fail(401, '请先登录');
    try {
      const result = await jwtVerify(
        token,
        new TextEncoder().encode(config.JWT_SECRET),
        { algorithms: ['HS256'], issuer: 'litetrack', audience: 'admin' },
      );
      const id = z.coerce
        .number()
        .int()
        .positive()
        .max(2147483647)
        .parse(result.payload.sub);
      c.set('userId', id);
    } catch {
      fail(401, '登录已过期，请重新登录');
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('origin');
      if (origin && origin !== new URL(config.PUBLIC_URL).origin)
        fail(403, '请求来源不匹配');
    }
    await next();
  };
const RATE_SCRIPT =
  "local n=redis.call('INCR',KEYS[1]); if redis.call('TTL',KEYS[1])<0 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n";
export async function rateLimit(
  redis: Resources['redis'],
  key: string,
  limit: number,
) {
  const count = await redis.eval(RATE_SCRIPT, 1, key, 60);
  if (typeof count !== 'number') fail(503, '限流服务暂不可用');
  if (count > limit) fail(429, '请求过于频繁，请稍后重试');
}
export function ipResolver(config: Config) {
  const trust = config.TRUST_PROXY
    ? proxyaddr.compile(config.TRUST_PROXY.split(',').map((v) => v.trim()))
    : () => false;
  return (c: AppContext) => {
    // 只信任明确配置的代理；默认忽略客户端自填的转发头。
    if (!c.env?.incoming) return '127.0.0.1';
    return proxyaddr(c.env.incoming, trust);
  };
}
