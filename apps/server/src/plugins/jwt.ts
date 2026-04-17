import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance, FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify'
import { config } from '../lib/config.js'

/**
 * JWT 用户载荷类型
 */
export interface UserPayload {
  userId: number
  githubId: string
  username: string
}

/**
 * JWT 认证插件
 * 
 * 注册 @fastify/jwt 并添加 'authenticate' 装饰器
 * 用于保护需要认证的路由
 */
const jwtPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  })

  // 为 fastify 实例添加 authenticate 方法装饰器
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  })
}

export default fp(jwtPlugin, {
  name: 'jwt-plugin',
  dependencies: ['zod-plugin'], // 确保在 zod-plugin 之后加载
})

/**
 * Fastify 类型声明合并
 * 扩展 FastifyInstance 以包含 authenticate 装饰器
 * 
 * 参考：https://fastify.dev/docs/latest/Reference/TypeScript/#declaration-merging
 */
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

/**
 * 扩展 @fastify/jwt 的 FastifyJWT 接口
 * 正确类型化 request.user 属性
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload
    user: UserPayload
  }
}
