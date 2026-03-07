import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyError } from 'fastify'

/**
 * 错误处理插件
 * 
 * 配置全局错误处理器和 404 处理器
 * 提供统一的错误响应格式
 */
async function errorHandlerPlugin(fastify: FastifyInstance) {
  // 全局错误处理器
  fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
    // 记录完整错误信息
    request.log.error(error)

    // 验证错误（来自 schema 验证）
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message,
      })
    }

    // Prisma 错误
    if (error.code?.startsWith('P')) {
      // Prisma 唯一约束冲突
      if (error.code === 'P2002') {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: '资源已存在',
        })
      }
      // 其他 Prisma 错误
      return reply.status(500).send({
        statusCode: 500,
        error: 'Database Error',
        message: process.env.NODE_ENV === 'production' 
          ? '数据库操作失败' 
          : error.message,
      })
    }

    // 自定义应用错误（有状态码）
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name || 'Error',
        message: error.message,
      })
    }

    // 意外错误 - 不泄露内部信息
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? '服务器内部错误' 
        : error.message,
    })
  })

  // 404 处理器
  fastify.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: `路由 ${request.method} ${request.url} 不存在`,
    })
  })
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler-plugin',
})
