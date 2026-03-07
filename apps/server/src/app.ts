import { buildServer } from './server.js'
import { config } from './lib/config.js'

/**
 * LiteTrack API 入口文件
 * 
 * 创建服务器实例并启动监听
 * 
 * @see https://fastify.dev/docs/latest/Reference/Server/#listen
 */
async function main() {
  const server = buildServer()

  try {
    await server.listen({
      port: config.PORT,
      host: config.HOST,
    })
    server.log.info(`Server listening on ${config.HOST}:${config.PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

main()
