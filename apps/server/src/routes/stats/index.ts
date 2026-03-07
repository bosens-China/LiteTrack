import { FastifyPluginAsync } from 'fastify'
import { UserPayload } from '../../plugins/jwt.js'
import { config } from '../../lib/config.js'

interface SiteParams {
  siteId: string
}

interface TrendQuery {
  days?: string
}

function formatDateInTimeZone(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: config.APP_TIMEZONE }).format(date)
}

const stats: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  fastify.get('/:siteId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).siteId, 10)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const totalViews = await fastify.prisma.pageView.aggregate({
      where: { siteId },
      _sum: { count: true },
    })

    const pageViews = await fastify.prisma.pageView.findMany({
      where: { siteId },
      orderBy: { count: 'desc' },
      take: 50,
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = formatDateInTimeZone(thirtyDaysAgo)

    const dailyViews = await fastify.prisma.dailyView.findMany({
      where: {
        siteId,
        date: { gte: thirtyDaysAgoStr },
      },
      orderBy: { date: 'asc' },
    })

    const popularPages = pageViews.slice(0, 10)

    return {
      site: {
        id: site.id,
        domain: site.domain,
        title: site.title,
      },
      summary: {
        totalViews: totalViews._sum.count || 0,
        totalPages: pageViews.length,
      },
      dailyViews,
      pageViews,
      popularPages,
    }
  })

  fastify.get('/:siteId/popular', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).siteId, 10)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const popularPages = await fastify.prisma.pageView.findMany({
      where: { siteId },
      orderBy: { count: 'desc' },
      take: 10,
      select: {
        path: true,
        count: true,
      },
    })

    return { popularPages }
  })

  fastify.get('/:siteId/trend', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).siteId, 10)
    const days = parseInt((request.query as TrendQuery).days || '30', 10)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = formatDateInTimeZone(startDate)

    const dailyViews = await fastify.prisma.dailyView.findMany({
      where: {
        siteId,
        date: { gte: startDateStr },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        count: true,
      },
    })

    return { dailyViews }
  })
}

export default stats
