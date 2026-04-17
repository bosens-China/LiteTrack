import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { config } from '../../lib/config.js'
import { parseUserAgent } from '../../lib/visitor.js'

/**
 * 上报请求验证 Schema
 */
const trackSchema = z.object({
  path: z.string().min(1).max(500),
  title: z.string().max(500).optional(),
  visitorId: z.string().trim().min(1).max(128).optional(),
  sessionId: z.string().trim().min(1).max(128).optional(),
})

const readProgressSchema = z.object({
  path: z.string().min(1).max(500),
  visitorId: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128).optional(),
  maxDepth: z.coerce.number().int().min(0).max(100),
})

function formatDateInTimeZone(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: config.APP_TIMEZONE }).format(date)
}

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
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

    const { path: rawPath, title, visitorId, sessionId } = parsed.data
    const path = normalizePath(rawPath)
    const siteId = siteToken.siteId

    // 获取客户端 IP 用于速率限制
    const ip = request.ip || request.socket.remoteAddress || 'unknown'
    const userAgent = request.headers['user-agent']
    const referer = request.headers['referer']
    const visitorAgent = parseUserAgent(userAgent)

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
        title: title || null,
        count: 1,
      },
      update: {
        count: { increment: 1 },
        ...(title !== undefined ? { title } : {}), // 如果有新标题则更新（包括空字符串）
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

    if (visitorId) {
      await Promise.all([
        fastify.prisma.dailyVisitor.createMany({
          data: [
            {
              siteId,
              date: today,
              visitorId,
            },
          ],
          skipDuplicates: true,
        }),
        fastify.prisma.pageDailyVisitor.createMany({
          data: [
            {
              siteId,
              path,
              date: today,
              visitorId,
            },
          ],
          skipDuplicates: true,
        }),
      ])
    }

    // 记录访问日志（异步，不阻塞响应）
    void fastify.prisma.accessLog.create({
      data: {
        siteId,
        path,
        title: title || null,
        ip,
        visitorId: visitorId || null,
        sessionId: sessionId || null,
        userAgent: userAgent || null,
        deviceType: visitorAgent.deviceType,
        browser: visitorAgent.browser,
        os: visitorAgent.os,
        referer: referer || null,
      }
    }).catch(() => {
      // 忽略日志记录错误，不影响主流程
    })

    return { success: true }
  })

  /**
   * POST /read-progress
   * 记录页面阅读进度（按 visitorId + 日期保留最大深度）
   */
  fastify.post('/read-progress', async (request, reply) => {
    const token = request.headers['x-site-token'] as string

    if (!token) {
      return reply.code(401).send({ error: '缺少令牌' })
    }

    const siteToken = await fastify.prisma.siteToken.findUnique({
      where: { token },
    })

    if (!siteToken || !siteToken.isActive) {
      return reply.code(401).send({ error: '无效的令牌' })
    }

    const parsed = readProgressSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }

    const { path: rawPath, visitorId, maxDepth } = parsed.data
    const path = normalizePath(rawPath)
    const today = formatDateInTimeZone(new Date())
    const siteId = siteToken.siteId

    const existing = await fastify.prisma.pageReadProgress.findUnique({
      where: {
        siteId_path_date_visitorId: {
          siteId,
          path,
          date: today,
          visitorId,
        },
      },
      select: {
        id: true,
        maxDepth: true,
      },
    })

    if (!existing) {
      await fastify.prisma.pageReadProgress.create({
        data: {
          siteId,
          path,
          date: today,
          visitorId,
          maxDepth,
        },
      })

      return { success: true }
    }

    if (maxDepth > existing.maxDepth) {
      await fastify.prisma.pageReadProgress.update({
        where: {
          id: existing.id,
        },
        data: {
          maxDepth,
        },
      })
    }

    return { success: true }
  })

  /**
   * GET /stats
   * 公开查询统计（X-Site-Token 鉴权）
   * - 无 path：返回全站总 PV、总页数
   * - 有 path：返回该页面的访问量
   *
   * Query: path?: string
   */
  fastify.get<{
    Querystring: { path?: string }
  }>('/stats', async (request, reply) => {
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

    const siteId = siteToken.siteId
    const path = typeof request.query?.path === 'string' ? normalizePath(request.query.path) : undefined

    if (path !== undefined) {
      // 指定页面：返回该 path 的访问量
      const page = await fastify.prisma.pageView.findUnique({
        where: {
          siteId_path: { siteId, path },
        },
        select: { path: true, count: true },
      })
      return {
        path: path,
        count: page?.count ?? 0,
      }
    }

    // 全站：总 PV、总页数
    const totalViews = await fastify.prisma.pageView.aggregate({
      where: { siteId },
      _sum: { count: true },
    })
    const totalPages = await fastify.prisma.pageView.count({
      where: { siteId },
    })

    return {
      totalViews: totalViews._sum.count ?? 0,
      totalPages,
    }
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
