import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { logsQuerySchema, parseDateBoundary, requireOwnedSite, siteParamsSchema } from './shared.js'

const logsRoutes: FastifyPluginAsync = async (fastify) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>()

  typed.get(
    '/:siteId/logs',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: logsQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const where: {
        siteId: number
        path?: { contains: string; mode: 'insensitive' }
        createdAt?: { gte?: Date; lte?: Date }
      } = {
        siteId: request.params.siteId,
      }

      if (request.query.path) {
        where.path = { contains: request.query.path, mode: 'insensitive' }
      }

      if (request.query.startDate || request.query.endDate) {
        where.createdAt = {}

        if (request.query.startDate) {
          const start = parseDateBoundary(request.query.startDate, 'start')
          if (!start) {
            throw fastify.httpErrors.badRequest('开始日期格式无效')
          }
          where.createdAt.gte = start
        }

        if (request.query.endDate) {
          const end = parseDateBoundary(request.query.endDate, 'end')
          if (!end) {
            throw fastify.httpErrors.badRequest('结束日期格式无效')
          }
          where.createdAt.lte = end
        }
      }

      const skip = (request.query.page - 1) * request.query.pageSize
      const [total, logs] = await Promise.all([
        fastify.prisma.accessLog.count({ where }),
        fastify.prisma.accessLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: request.query.pageSize,
          select: {
            id: true,
            path: true,
            title: true,
            ip: true,
            userAgent: true,
            deviceType: true,
            browser: true,
            os: true,
            referer: true,
            createdAt: true,
          },
        }),
      ])

      return {
        logs,
        pagination: {
          total,
          page: request.query.page,
          pageSize: request.query.pageSize,
          totalPages: Math.ceil(total / request.query.pageSize),
        },
      }
    },
  )
}

export default logsRoutes
