import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  daysQuerySchema,
  formatDateInTimeZone,
  getDateBoundary,
  getDateDaysAgo,
  normalizePath,
  readingQuerySchema,
  requireOwnedSite,
  siteParamsSchema,
} from './shared.js'

function toSortedBuckets<T extends { _count: { _all: number } }>(
  rows: T[],
  getName: (row: T) => string | null | undefined,
) {
  return [...rows]
    .map((row) => ({
      name: getName(row) || 'unknown',
      count: row._count._all,
    }))
    .sort((left, right) => right.count - left.count)
}

const audienceRoutes: FastifyPluginAsync = async (fastify) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>()

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
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const [dailyVisitors, groupedVisitors, todayVisitors] = await Promise.all([
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
      ])

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
      }
    },
  )

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
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const startDate = getDateBoundary(request.query.days, 'start')
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
      ])

      return {
        summary: {
          days: request.query.days,
        },
        deviceTypes: toSortedBuckets(deviceTypes, (row) => row.deviceType),
        browsers: toSortedBuckets(browsers, (row) => row.browser),
        operatingSystems: toSortedBuckets(osList, (row) => row.os),
      }
    },
  )

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
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const normalizedPath = request.query.path ? normalizePath(request.query.path) : undefined
      const where = {
        siteId: request.params.siteId,
        date: { gte: getDateDaysAgo(request.query.days) },
        ...(normalizedPath ? { path: normalizedPath } : {}),
      }

      const [totalReaders, depth25Count, depth50Count, depth75Count, depth100Count, averageDepth] =
        await Promise.all([
          fastify.prisma.pageReadProgress.count({ where }),
          fastify.prisma.pageReadProgress.count({ where: { ...where, maxDepth: { gte: 25 } } }),
          fastify.prisma.pageReadProgress.count({ where: { ...where, maxDepth: { gte: 50 } } }),
          fastify.prisma.pageReadProgress.count({ where: { ...where, maxDepth: { gte: 75 } } }),
          fastify.prisma.pageReadProgress.count({ where: { ...where, maxDepth: { gte: 100 } } }),
          fastify.prisma.pageReadProgress.aggregate({
            where,
            _avg: {
              maxDepth: true,
            },
          }),
        ])

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
      }
    },
  )
}

export default audienceRoutes
