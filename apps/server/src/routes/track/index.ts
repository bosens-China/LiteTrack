import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { config } from '../../lib/config.js'

/**
 * 上报请求验证 Schema
 */
const trackSchema = z.object({
  path: z.string().min(1).max(500),
})

function formatDateInTimeZone(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: config.APP_TIMEZONE }).format(date)
}

/**
 * 追踪路由
 * 
 * SDK 上报页面访问的公开端点
 * 需要在 X-Site-Token 请求头中提供有效的网站令牌
 * 实现速率限制以防止滥用（10 秒窗口）
 */
const track: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {

  /**
   * POST /
   * 记录页面访问
   * 
   * 请求头：
   *   X-Site-Token: <site-token>
   * 
   * 请求体：
   *   { path: string }
   * 
   * 速率限制：每 IP + 路径 10 秒
   */
  fastify.post('/', async (request, reply) => {
    const token = request.headers['x-site-token'] as string

    if (!token) {
      return reply.code(401).send({ error: '缺少令牌' })
    }

    // 验证网站令牌
    const siteToken = await fastify.prisma.siteToken.findUnique({
      where: { token },
      include: { site: true },
    })

    if (!siteToken || !siteToken.isActive) {
      return reply.code(401).send({ error: '无效的令牌' })
    }

    // 验证请求体
    const parsed = trackSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }

    const { path } = parsed.data
    const siteId = siteToken.siteId

    // 获取客户端 IP 用于速率限制
    const ip = request.ip || request.socket.remoteAddress || 'unknown'

    // 检查速率限制（10 秒窗口）
    const allowed = await fastify.checkRateLimit(ip, siteId, path, 10)

    if (!allowed) {
      // 返回成功但表示已缓存（未计数）
      return { success: true, cached: true }
    }

    const today = formatDateInTimeZone(new Date())

    // 更新或创建页面访问计数
    await fastify.prisma.pageView.upsert({
      where: {
        siteId_path: {
          siteId,
          path,
        },
      },
      create: {
        siteId,
        path,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })

    // 更新或创建每日访问计数
    await fastify.prisma.dailyView.upsert({
      where: {
        siteId_date: {
          siteId,
          date: today,
        },
      },
      create: {
        siteId,
        date: today,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })

    return { success: true }
  })

  /**
   * GET /verify
   * 验证网站令牌是否有效
   * SDK 初始化验证时使用
   * 
   * 请求头：
   *   X-Site-Token: <site-token>
   */
  fastify.get('/verify', async (request, reply) => {
    const token = request.headers['x-site-token'] as string

    if (!token) {
      return reply.code(401).send({ error: '缺少令牌' })
    }

    const siteToken = await fastify.prisma.siteToken.findUnique({
      where: { token },
      include: { site: true },
    })

    if (!siteToken || !siteToken.isActive) {
      return reply.code(401).send({ error: '无效的令牌' })
    }

    return {
      valid: true,
      site: {
        id: siteToken.site.id,
        domain: siteToken.site.domain,
        title: siteToken.site.title,
      },
    }
  })
}

export default track
