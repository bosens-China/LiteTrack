import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  daysQuerySchema,
  formatDateInTimeZone,
  getDateDaysAgo,
  requireOwnedSite,
  siteParamsSchema,
} from './shared.js'

const overviewRoutes: FastifyPluginAsync = async (fastify) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>()

  typed.get('/dashboard', { onRequest: [fastify.authenticate] }, async (request) => {
    const userId = request.user.userId

    const [siteCount, siteRows] = await Promise.all([
      fastify.prisma.site.count({
        where: { userId },
      }),
      fastify.prisma.site.findMany({
        where: { userId },
        select: { id: true },
      }),
    ])

    if (siteRows.length === 0) {
      return {
        summary: {
          siteCount,
          todayViews: 0,
          totalViews: 0,
        },
      }
    }

    const siteIds = siteRows.map((site) => site.id)
    const today = formatDateInTimeZone(new Date())

    const [todayViews, totalViews] = await Promise.all([
      fastify.prisma.dailyView.aggregate({
        where: {
          siteId: { in: siteIds },
          date: today,
        },
        _sum: { count: true },
      }),
      fastify.prisma.pageView.aggregate({
        where: {
          siteId: { in: siteIds },
        },
        _sum: { count: true },
      }),
    ])

    return {
      summary: {
        siteCount,
        todayViews: todayViews._sum.count ?? 0,
        totalViews: totalViews._sum.count ?? 0,
      },
    }
  })

  typed.get(
    '/:siteId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
      },
    },
    async (request) => {
      const site = await requireOwnedSite(fastify, request.user.userId, request.params.siteId)
      const startDateStr = getDateDaysAgo(30)

      const [totalViews, totalPages, pageViews, dailyViews] = await Promise.all([
        fastify.prisma.pageView.aggregate({
          where: { siteId: site.id },
          _sum: { count: true },
        }),
        fastify.prisma.pageView.count({
          where: { siteId: site.id },
        }),
        fastify.prisma.pageView.findMany({
          where: { siteId: site.id },
          orderBy: { count: 'desc' },
          take: 50,
        }),
        fastify.prisma.dailyView.findMany({
          where: {
            siteId: site.id,
            date: { gte: startDateStr },
          },
          orderBy: { date: 'asc' },
        }),
      ])

      return {
        site: {
          id: site.id,
          domain: site.domain,
          title: site.title,
        },
        summary: {
          totalViews: totalViews._sum.count ?? 0,
          totalPages,
        },
        dailyViews,
        pageViews,
        popularPages: pageViews.slice(0, 10),
      }
    },
  )

  typed.get(
    '/:siteId/popular',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
      },
    },
    async (request) => {
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const popularPages = await fastify.prisma.pageView.findMany({
        where: { siteId: request.params.siteId },
        orderBy: { count: 'desc' },
        take: 10,
        select: {
          path: true,
          title: true,
          count: true,
        },
      })

      return { popularPages }
    },
  )

  typed.get(
    '/:siteId/trend',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: daysQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const dailyViews = await fastify.prisma.dailyView.findMany({
        where: {
          siteId: request.params.siteId,
          date: { gte: getDateDaysAgo(request.query.days) },
        },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          count: true,
        },
      })

      return { dailyViews }
    },
  )
}

export default overviewRoutes
