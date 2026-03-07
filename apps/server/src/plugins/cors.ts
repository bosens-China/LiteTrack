import fp from 'fastify-plugin'
import fastifyCors from '@fastify/cors'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import { config } from '../lib/config.js'

/**
 * CORS 插件
 * 
 * 为所有来源启用跨域资源共享
 * SDK 和管理后台需要与 API 通信
 * 
 * 生产环境建议配置具体允许的域名
 */
const corsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 根据环境配置 CORS origin
  const origin = config.NODE_ENV === 'production' 
    ? true // 生产环境建议配置具体域名，如 ['https://admin.example.com']
    : true // 开发环境允许所有

  await fastify.register(fastifyCors, {
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Site-Token'],
  })
}

export default fp(corsPlugin, {
  name: 'cors-plugin',
})
