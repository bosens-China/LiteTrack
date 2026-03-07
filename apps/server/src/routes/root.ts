import { FastifyPluginAsync } from 'fastify'

/**
 * 根路由
 * 健康检查端点
 */
const root: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {
  fastify.get('/', async function (_request, _reply) {
    return { 
      name: 'LiteTrack API',
      version: '1.0.0',
      status: 'ok'
    }
  })
}

export default root
