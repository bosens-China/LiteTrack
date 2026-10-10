import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { Prisma } from '@prisma/client';
import { collectSchema } from '@litetrack/contracts';
import { collect } from './modules/collect.js';
import { authRoutes } from './routes/auth.js';
import { siteRoutes } from './routes/sites.js';
import {
  fail,
  ipResolver,
  rateLimit,
  type Dependencies,
  type Env,
} from './lib/http.js';

export function buildServer(deps: Dependencies) {
  const { db, redis, logger, config } = deps;
  const app = new OpenAPIHono<Env>({
    defaultHook: (result) => {
      if (!result.success) fail(400, '上报参数无效或协议不支持');
    },
  });
  const getIp = ipResolver(config);
  app.use(
    '/litetrack/collect',
    cors({
      origin: '*',
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'X-Site-Token', 'X-LiteTrack-SDK'],
      maxAge: 600,
    }),
  );
  app.use('*', async (c, next) => {
    const started = Date.now();
    await next();
    logger.info(
      {
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: c.res.status,
        durationMs: Date.now() - started,
      },
      'request',
    );
  });
  app.use(
    '*',
    bodyLimit({
      maxSize: 16384,
      onError: (c) =>
        c.json(
          { data: null, code: 'PAYLOAD_TOO_LARGE', message: '请求内容过大' },
          413,
        ),
    }),
  );
  app.use('/litetrack/*', async (c, next) => {
    if (c.req.method !== 'OPTIONS')
      await rateLimit(redis, 'rate:ip:' + getIp(c), config.TRACK_IP_RATE_LIMIT);
    await next();
  });
  app.get('/health', async (c) => {
    await db.$queryRaw`SELECT 1`;
    await redis.ping();
    return c.json({ status: 'ok' });
  });
  app.openapi(
    createRoute({
      method: 'post',
      path: '/litetrack/collect',
      request: {
        body: {
          required: true,
          content: { 'application/json': { schema: collectSchema } },
        },
      },
      responses: {
        200: {
          description: '已提交或重复事件',
          content: {
            'application/json': {
              schema: z.object({
                success: z.literal(true),
                duplicate: z.boolean(),
              }),
            },
          },
        },
      },
    }),
    async (c) => {
      const token = c.req.header('x-site-token') || '';
      if (!/^[a-f0-9]{64}$/.test(token)) fail(401, '站点 Token 无效');
      const siteToken = await db.siteToken.findUnique({
        where: { token },
        include: { site: true },
      });
      if (!siteToken?.isActive) fail(401, '站点 Token 无效或已停用');
      const origin = c.req.header('origin');
      if (origin) {
        let host: string;
        try {
          host = new URL(origin).host;
        } catch {
          fail(403, '来源域名不匹配');
        }
        if (host !== siteToken.site.domain) fail(403, '来源域名不匹配');
      }
      await rateLimit(
        redis,
        'rate:site:' + siteToken.siteId,
        config.TRACK_SITE_RATE_LIMIT,
      );
      const result = await collect(db, siteToken.site, c.req.valid('json'));
      return c.json({ success: true as const, ...result });
    },
  );
  app.route('/litetrack/api/auth', authRoutes(deps));
  app.route('/litetrack/api/sites', siteRoutes(deps));
  app.doc('/litetrack/api/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'LiteTrack', version: '1' },
  });
  app.get(
    '/litetrack/api/docs',
    swaggerUI({ url: '/litetrack/api/openapi.json' }),
  );
  app.notFound((c) =>
    c.json({ data: null, message: '接口不存在', code: 'NOT_FOUND' }, 404),
  );
  app.onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json(
        { data: null, message: error.message, code: 'HTTP_' + error.status },
        error.status,
      );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      return c.json(
        { data: null, message: '记录已存在', code: 'CONFLICT' },
        409,
      );
    logger.error({ name: error.name }, '请求失败');
    return c.json(
      { data: null, message: '服务暂不可用，请稍后重试', code: 'UNAVAILABLE' },
      503,
    );
  });
  return app;
}
