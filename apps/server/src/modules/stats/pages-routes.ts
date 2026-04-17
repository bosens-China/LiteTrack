import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { pagesQuerySchema, requireOwnedSite, siteParamsSchema } from './shared.js'

const pagesRoutes: FastifyPluginAsync = async (fastify) => {
  const typed = fastify.withTypeProvider<ZodTypeProvider>()

  typed.get(
    '/:siteId/pages',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: siteParamsSchema,
        querystring: pagesQuerySchema,
      },
    },
    async (request) => {
      await requireOwnedSite(fastify, request.user.userId, request.params.siteId)

      const searchQuery = request.query.q?.trim()
      const skip = (request.query.page - 1) * request.query.pageSize
      const where = {
        siteId: request.params.siteId,
        ...(searchQuery
          ? {
              OR: [
                { path: { contains: searchQuery, mode: 'insensitive' as const } },
                { title: { contains: searchQuery, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      }

      const [total, pages] = await Promise.all([
        fastify.prisma.pageView.count({ where }),
        fastify.prisma.pageView.findMany({
          where,
          orderBy: {
            [request.query.sortBy]: request.query.sortOrder,
          },
          skip,
          take: request.query.pageSize,
          select: {
            path: true,
            title: true,
            count: true,
          },
        }),
      ])

      return {
        pages,
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

export default pagesRoutes
