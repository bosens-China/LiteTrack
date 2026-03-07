import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { FastifyInstance } from 'fastify'
import { config } from '../lib/config.js'

/**
 * Prisma Client 单例
 * 
 * 在开发环境中，将实例挂载到 global 对象以防止热重载时的连接池耗尽
 * 
 * @see https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/instantiate-prisma-client
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

const pgPool = globalForPrisma.pgPool ?? new Pool({ connectionString: config.DATABASE_URL })
const adapter = new PrismaPg(pgPool)
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pgPool = pgPool
}

/**
 * Prisma 插件
 * 
 * - 将 Prisma Client 装饰到 Fastify 实例
 * - 服务器关闭时断开连接
 */
async function prismaPlugin(fastify: FastifyInstance) {
  // 装饰 Fastify 实例
  fastify.decorate('prisma', prisma)

  // 服务器关闭时清理资源
  fastify.addHook('onClose', async () => {
    fastify.log.info('closing database connection')
    await prisma.$disconnect()
    await pgPool.end()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma-plugin',
})

/**
 * 类型声明合并
 * 扩展 FastifyInstance 以包含 prisma 装饰器
 */
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}
