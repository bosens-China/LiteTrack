import { Prisma } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  daysQuerySchema,
  formatDateInTimeZone,
  getDateBoundary,
  getDateDaysAgo,
  normalizePath,
  readingQuerySchema,
  requireOwnedSite,
  siteParamsSchema,
} from './shared.js';

type ReferrerRow = { domain: string; count: number };
type BounceRow = { total_sessions: number; bounced_sessions: number };
type DurationRow = { path: string; avg_duration: number; sample_count: number };

function toSortedBuckets<T extends { _count: { _all: number } }>(
  rows: T[],
  getName: (row: T) => string | null | undefined,
) {
  return [...rows]
    .map((row) => ({
      name: getName(row) || 'unknown',
      count: row._count._all,
    }))
    .sort((left, right) => right.count - left.count);
}

const audienceRoutes: FastifyPluginAsync = async (fastify) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/:siteId/visitors',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: daysQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const [dailyVisitors, groupedVisitors, todayVisitors] = await Promise.all(
        [
          fastify.prisma.dailyVisitor.groupBy({
            by: ['date'],
            where: {
              siteId: request.params.siteId,
              date: { gte: getDateDaysAgo(request.query.days) },
            },
            _count: {
              _all: true,
            },
            orderBy: {
              date: 'asc',
            },
          }),
          fastify.prisma.dailyVisitor.groupBy({
            by: ['visitorId'],
            where: {
              siteId: request.params.siteId,
              date: { gte: getDateDaysAgo(request.query.days) },
            },
          }),
          fastify.prisma.dailyVisitor.count({
            where: {
              siteId: request.params.siteId,
              date: formatDateInTimeZone(new Date()),
            },
          }),
        ],
      );

      return {
        summary: {
          totalVisitors: groupedVisitors.length,
          todayVisitors,
          days: request.query.days,
        },
        dailyVisitors: dailyVisitors.map((item) => ({
          date: item.date,
          count: item._count._all,
        })),
      };
    },
  );

  typed.get(
    '/:siteId/devices',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: daysQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const startDate = getDateBoundary(request.query.days, 'start');
      const [deviceTypes, browsers, osList] = await Promise.all([
        fastify.prisma.accessLog.groupBy({
          by: ['deviceType'],
          where: {
            siteId: request.params.siteId,
            createdAt: { gte: startDate },
          },
          _count: {
            _all: true,
          },
        }),
        fastify.prisma.accessLog.groupBy({
          by: ['browser'],
          where: {
            siteId: request.params.siteId,
            createdAt: { gte: startDate },
          },
          _count: {
            _all: true,
          },
        }),
        fastify.prisma.accessLog.groupBy({
          by: ['os'],
          where: {
            siteId: request.params.siteId,
            createdAt: { gte: startDate },
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      return {
        summary: {
          days: request.query.days,
        },
        deviceTypes: toSortedBuckets(deviceTypes, (row) => row.deviceType),
        browsers: toSortedBuckets(browsers, (row) => row.browser),
        operatingSystems: toSortedBuckets(osList, (row) => row.os),
      };
    },
  );

  typed.get(
    '/:siteId/reading',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: readingQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const normalizedPath = request.query.path
        ? normalizePath(request.query.path)
        : undefined;
      const where = {
        siteId: request.params.siteId,
        date: { gte: getDateDaysAgo(request.query.days) },
        ...(normalizedPath ? { path: normalizedPath } : {}),
      };

      const [
        totalReaders,
        depth25Count,
        depth50Count,
        depth75Count,
        depth100Count,
        averageDepth,
      ] = await Promise.all([
        fastify.prisma.pageReadProgress.count({ where }),
        fastify.prisma.pageReadProgress.count({
          where: { ...where, maxDepth: { gte: 25 } },
        }),
        fastify.prisma.pageReadProgress.count({
          where: { ...where, maxDepth: { gte: 50 } },
        }),
        fastify.prisma.pageReadProgress.count({
          where: { ...where, maxDepth: { gte: 75 } },
        }),
        fastify.prisma.pageReadProgress.count({
          where: { ...where, maxDepth: { gte: 100 } },
        }),
        fastify.prisma.pageReadProgress.aggregate({
          where,
          _avg: {
            maxDepth: true,
          },
        }),
      ]);

      return {
        summary: {
          path: normalizedPath ?? null,
          days: request.query.days,
          totalReaders,
          depth25Count,
          depth50Count,
          depth75Count,
          depth100Count,
          completionRate: totalReaders > 0 ? depth75Count / totalReaders : 0,
          averageDepth: averageDepth._avg.maxDepth ?? 0,
        },
      };
    },
  );
  // ────────────────────────────────────────────────────────────────────
  // GET /:siteId/referrers  — 流量来源域名聚合
  // ────────────────────────────────────────────────────────────────────
  typed.get(
    '/:siteId/referrers',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: daysQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const startDate = getDateBoundary(request.query.days, 'start');
      const siteId = request.params.siteId;

      const rows = await fastify.prisma.$queryRaw<ReferrerRow[]>`
        SELECT
          CASE
            WHEN referer IS NULL OR trim(referer) = '' THEN 'direct'
            ELSE lower(regexp_replace(referer, '^https?://([^/?#]+).*$', '\\1'))
          END AS domain,
          COUNT(*)::int AS count
        FROM access_logs
        WHERE site_id = ${siteId}
          AND created_at >= ${startDate}
        GROUP BY domain
        ORDER BY count DESC
        LIMIT 20
      `;

      return {
        summary: { days: request.query.days },
        referrers: rows,
      };
    },
  );

  // ────────────────────────────────────────────────────────────────────
  // GET /:siteId/bounce  — 跳出率
  // ────────────────────────────────────────────────────────────────────
  typed.get(
    '/:siteId/bounce',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: daysQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const startDate = getDateBoundary(request.query.days, 'start');
      const siteId = request.params.siteId;

      const [row] = await fastify.prisma.$queryRaw<BounceRow[]>`
        WITH session_stats AS (
          SELECT
            session_id,
            COUNT(DISTINCT path)::int AS page_count
          FROM access_logs
          WHERE site_id = ${siteId}
            AND created_at >= ${startDate}
            AND session_id IS NOT NULL
          GROUP BY session_id
        )
        SELECT
          COUNT(*)::int                                                    AS total_sessions,
          COALESCE(SUM(CASE WHEN page_count = 1 THEN 1 ELSE 0 END), 0)::int AS bounced_sessions
        FROM session_stats
      `;

      const totalSessions = row?.total_sessions ?? 0;
      const bouncedSessions = row?.bounced_sessions ?? 0;

      return {
        summary: {
          days: request.query.days,
          totalSessions,
          bouncedSessions,
          bounceRate: totalSessions > 0 ? bouncedSessions / totalSessions : 0,
        },
      };
    },
  );

  // ────────────────────────────────────────────────────────────────────
  // GET /:siteId/duration  — 页面平均停留时长
  // ────────────────────────────────────────────────────────────────────
  typed.get(
    '/:siteId/duration',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: readingQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(
        fastify,
        request.user.userId,
        request.params.siteId,
      );

      const startDateStr = getDateDaysAgo(request.query.days);
      const siteId = request.params.siteId;
      const normalizedPath = request.query.path
        ? normalizePath(request.query.path)
        : undefined;

      const pathFilter = normalizedPath
        ? Prisma.sql`AND path = ${normalizedPath}`
        : Prisma.empty;

      const rows = await fastify.prisma.$queryRaw<DurationRow[]>(
        Prisma.sql`
          SELECT
            path,
            ROUND(AVG(duration))::int AS avg_duration,
            COUNT(*)::int             AS sample_count
          FROM page_durations
          WHERE site_id = ${siteId}
            AND date >= ${startDateStr}
            ${pathFilter}
          GROUP BY path
          ORDER BY sample_count DESC
          LIMIT 20
        `,
      );

      return {
        summary: {
          days: request.query.days,
          path: normalizedPath ?? null,
        },
        pages: rows.map((row) => ({
          path: row.path,
          avgDuration: row.avg_duration,
          sampleCount: row.sample_count,
        })),
      };
    },
  );
};

export default audienceRoutes;
