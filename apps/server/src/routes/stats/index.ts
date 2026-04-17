import type { FastifyPluginAsync } from 'fastify'
import audienceRoutes from '../../modules/stats/audience-routes.js'
import logsRoutes from '../../modules/stats/logs-routes.js'
import overviewRoutes from '../../modules/stats/overview-routes.js'
import pagesRoutes from '../../modules/stats/pages-routes.js'

const stats: FastifyPluginAsync = async (fastify) => {
  await fastify.register(overviewRoutes)
  await fastify.register(pagesRoutes)
  await fastify.register(audienceRoutes)
  await fastify.register(logsRoutes)
}

export default stats
