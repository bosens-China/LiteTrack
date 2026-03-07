import fp from 'fastify-plugin'
import Redis from 'ioredis'
import type { FastifyInstance } from 'fastify'
import { config } from '../lib/config.js'

/**
 * Redis 插件
 * 
 * - 提供 Redis 客户端实例
 * - 用于速率限制和缓存
 * - 服务器关闭时断开连接
 */
async function redisPlugin(fastify: FastifyInstance) {
  const redis = new Redis(config.REDIS_URL)

  // 装饰 Fastify 实例
  fastify.decorate('redis', redis)

  // 装饰速率限制检查方法
  fastify.decorate('checkRateLimit', async (
    ip: string,
    siteId: number,
    path: string,
    ttlSeconds: number = 10
  ): Promise<boolean> => {
    const key = `rate:${siteId}:${path}:${ip}`
    const exists = await redis.exists(key)
    if (exists) {
      return false // 被限流
    }
    await redis.setex(key, ttlSeconds, '1')
    return true // 允许访问
  })

  // 服务器关闭时清理资源
  fastify.addHook('onClose', async () => {
    fastify.log.info('closing redis connection')
    await redis.quit()
  })
}

export default fp(redisPlugin, {
  name: 'redis-plugin',
})

/**
 * 类型声明合并
 * 扩展 FastifyInstance 以包含 redis 装饰器
 */
declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
    checkRateLimit: (
      ip: string,
      siteId: number,
      path: string,
      ttlSeconds?: number
    ) => Promise<boolean>
  }
}
