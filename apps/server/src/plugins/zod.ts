import fp from 'fastify-plugin'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import type { FastifyInstance } from 'fastify'

/**
 * Zod Type Provider 插件
 * 
 * 配置 Fastify 使用 Zod 进行请求/响应验证和序列化
 * 启用完整的 TypeScript 类型推断
 * 
 * @see https://github.com/turkerdev/fastify-type-provider-zod
 */
async function zodPlugin(fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)
}

export default fp(zodPlugin, {
  name: 'zod-plugin',
})
