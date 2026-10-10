import { randomBytes } from 'node:crypto';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  idSchema,
  pagesQuerySchema,
  rangeSchema,
  siteInputSchema,
  tokenInputSchema,
  tokenUpdateSchema,
  siteSchema,
  siteSummarySchema,
  siteTokenSchema,
  metricsSchema,
  trendPointSchema,
  referrerRowSchema,
  pagesResultSchema,
} from '@litetrack/contracts';
import {
  authenticate,
  fail,
  ownedSite,
  success,
  response,
  type Dependencies,
  type Env,
} from '../lib/http.js';
import {
  metrics,
  pages,
  referrers,
  todayRange,
  trend,
} from '../modules/stats.js';

const tokenParams = idSchema.extend({ tokenId: idSchema.shape.id });
export function siteRoutes(deps: Dependencies) {
  const { db, config } = deps;
  const app = new OpenAPIHono<Env>({
    defaultHook: (result) => {
      if (!result.success) fail(400, '参数无效，请检查输入');
    },
  });
  app.use('*', authenticate(config));
  app.openapi(
    createRoute({
      method: 'get',
      path: '/',
      responses: response(siteSummarySchema.array()),
    }),
    async (c) => {
      const sites = await db.site.findMany({
        where: { userId: c.get('userId') },
        orderBy: { id: 'desc' },
      });
      const data = await Promise.all(
        sites.map(async (site) => ({
          ...site,
          today: await metrics(db, site.id, todayRange()),
        })),
      );
      return success(c, data);
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/',
      request: {
        body: {
          content: { 'application/json': { schema: siteInputSchema } },
          required: true,
        },
      },
      responses: response(siteSchema),
    }),
    async (c) => {
      const input = c.req.valid('json');
      const site = await db.site.create({
        data: { ...input, userId: c.get('userId') },
      });
      return success(c, site);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/{id}',
      request: { params: idSchema },
      responses: response(siteSchema),
    }),
    async (c) => success(c, await ownedSite(c, db)),
  );
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/{id}',
      request: {
        params: idSchema,
        body: {
          required: true,
          content: { 'application/json': { schema: siteInputSchema } },
        },
      },
      responses: response(siteSchema),
    }),
    async (c) => {
      const site = await ownedSite(c, db);
      return success(
        c,
        await db.site.update({
          where: { id: site.id },
          data: c.req.valid('json'),
        }),
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/{id}',
      request: { params: idSchema },
      responses: response(z.null()),
    }),
    async (c) => {
      const site = await ownedSite(c, db);
      await db.site.delete({ where: { id: site.id } });
      return success(c, null);
    },
  );
  app.openapi(
    createRoute({
      method: 'get',
      path: '/{id}/tokens',
      request: { params: idSchema },
      responses: response(siteTokenSchema.array()),
    }),
    async (c) => {
      c.header('Cache-Control', 'no-store');
      const site = await ownedSite(c, db);
      return success(
        c,
        await db.siteToken.findMany({
          where: { siteId: site.id },
          select: {
            id: true,
            token: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { id: 'desc' },
        }),
      );
    },
  );
  app.openapi(
    createRoute({
      method: 'post',
      path: '/{id}/tokens',
      request: {
        params: idSchema,
        body: {
          required: true,
          content: { 'application/json': { schema: tokenInputSchema } },
        },
      },
      responses: response(siteTokenSchema),
    }),
    async (c) => {
      c.header('Cache-Control', 'no-store');
      const site = await ownedSite(c, db);
      const token = await db.siteToken.create({
        data: {
          siteId: site.id,
          name: c.req.valid('json').name,
          token: randomBytes(32).toString('hex'),
        },
      });
      return success(c, token);
    },
  );
  app.openapi(
    createRoute({
      method: 'patch',
      path: '/{id}/tokens/{tokenId}',
      request: {
        params: tokenParams,
        body: {
          required: true,
          content: { 'application/json': { schema: tokenUpdateSchema } },
        },
      },
      responses: response(z.null()),
    }),
    async (c) => {
      const site = await ownedSite(c, db);
      const tokenId = c.req.valid('param').tokenId;
      const result = await db.siteToken.updateMany({
        where: { id: tokenId, siteId: site.id },
        data: c.req.valid('json'),
      });
      if (!result.count) fail(404, 'Token 不存在');
      return success(c, null);
    },
  );
  app.openapi(
    createRoute({
      method: 'delete',
      path: '/{id}/tokens/{tokenId}',
      request: { params: tokenParams },
      responses: response(z.null()),
    }),
    async (c) => {
      const site = await ownedSite(c, db);
      const result = await db.siteToken.deleteMany({
        where: { id: c.req.valid('param').tokenId, siteId: site.id },
      });
      if (!result.count) fail(404, 'Token 不存在');
      return success(c, null);
    },
  );
  for (const kind of ['overview', 'trend', 'referrers'] as const) {
    app.openapi(
      createRoute({
        method: 'get',
        path: '/{id}/' + kind,
        request: { params: idSchema, query: rangeSchema },
        responses: response(
          z.union([
            metricsSchema,
            trendPointSchema.array(),
            referrerRowSchema.array(),
          ]),
        ),
      }),
      async (c) => {
        const site = await ownedSite(c, db);
        const range = c.req.valid('query');
        const data =
          kind === 'overview'
            ? await metrics(db, site.id, range)
            : kind === 'trend'
              ? await trend(db, site.id, range)
              : await referrers(db, site.id, range);
        return success(c, data);
      },
    );
  }
  app.openapi(
    createRoute({
      method: 'get',
      path: '/{id}/pages',
      request: { params: idSchema, query: pagesQuerySchema },
      responses: response(pagesResultSchema),
    }),
    async (c) => {
      const site = await ownedSite(c, db);
      const query = c.req.valid('query');
      return success(c, await pages(db, site.id, query, query.page));
    },
  );
  return app;
}
