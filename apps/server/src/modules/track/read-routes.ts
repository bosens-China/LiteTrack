import type { FastifyPluginAsync } from 'fastify';
import { normalizePath } from '../stats/shared.js';

const readRoutes: FastifyPluginAsync = async (fastify) => {
  // ────────────────────────────────────────────────────────
  // GET /stats  —  公开 PV 查询（Site Token 鉴权）
  // ────────────────────────────────────────────────────────
  fastify.get<{ Querystring: { path?: string } }>(
    '/stats',
    async (request, reply) => {
      const token = request.headers['x-site-token'] as string | undefined;
      if (!token) return reply.code(401).send({ error: '缺少令牌' });

      const siteToken = await fastify.prisma.siteToken.findUnique({
        where: { token },
        include: { site: true },
      });
      if (!siteToken || !siteToken.isActive)
        return reply.code(401).send({ error: '无效的令牌' });

      const siteId = siteToken.siteId;
      const path =
        typeof request.query?.path === 'string'
          ? normalizePath(request.query.path)
          : undefined;

      if (path !== undefined) {
        const page = await fastify.prisma.pageView.findUnique({
          where: { siteId_path: { siteId, path } },
          select: { path: true, count: true },
        });
        return { path, count: page?.count ?? 0 };
      }

      const [totalViews, totalPages] = await Promise.all([
        fastify.prisma.pageView.aggregate({
          where: { siteId },
          _sum: { count: true },
        }),
        fastify.prisma.pageView.count({ where: { siteId } }),
      ]);
      return { totalViews: totalViews._sum.count ?? 0, totalPages };
    },
  );

  // ────────────────────────────────────────────────────────
  // GET /verify  —  令牌有效性验证
  // ────────────────────────────────────────────────────────
  fastify.get('/verify', async (request, reply) => {
    const token = request.headers['x-site-token'] as string | undefined;
    if (!token) return reply.code(401).send({ error: '缺少令牌' });

    const siteToken = await fastify.prisma.siteToken.findUnique({
      where: { token },
      include: { site: true },
    });
    if (!siteToken || !siteToken.isActive)
      return reply.code(401).send({ error: '无效的令牌' });

    return {
      valid: true,
      site: {
        id: siteToken.site.id,
        domain: siteToken.site.domain,
        title: siteToken.site.title,
      },
    };
  });
};

export default readRoutes;
