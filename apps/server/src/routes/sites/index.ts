import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { UserPayload } from '../../plugins/jwt.js'

/**
 * 路由参数类型
 */
interface SiteParams {
  id: string
}

interface TokenParams {
  siteId: string
  tokenId: string
}

/**
 * 网站验证 Schema
 */
const createSiteSchema = z.object({
  domain: z.string().trim().min(1).max(255),
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(1000).optional(),
})

const updateSiteSchema = z.object({
  title: z.string().trim().max(255).optional(),
  description: z.string().trim().max(1000).optional(),
})

const createTokenSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(1000).optional(),
})

/** 字段均可省略：全空表示不修改（幂等，直接保存也成功） */
const updateTokenSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(1000).optional(),
})

const tokenMetaSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
} as const

/**
 * 网站管理路由
 * 
 * 网站和访问令牌的 CRUD 操作
 * 所有路由都需要 JWT 认证
 */
const sites: FastifyPluginAsync = async (fastify, _opts): Promise<void> => {

  /**
   * GET /
   * 获取当前用户的所有网站
   */
  fastify.get('/', { onRequest: [fastify.authenticate] }, async (request, _reply) => {
    const { userId } = request.user as UserPayload

    const sites = await fastify.prisma.site.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            tokens: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { sites }
  })

  /**
   * POST /
   * 为当前用户创建新网站
   * 自动创建一个默认访问令牌
   */
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload

    const parsed = createSiteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }

    const { domain, title, description } = parsed.data

    const rawToken = crypto.randomBytes(32).toString('hex')

    try {
      const { site } = await fastify.prisma.$transaction(async (tx) => {
        const createdSite = await tx.site.create({
          data: {
            userId,
            domain,
            title: title ?? '',
            description: description || null,
          },
        })

        await tx.siteToken.create({
          data: {
            siteId: createdSite.id,
            token: rawToken,
            name: '默认令牌',
          },
        })

        return { site: createdSite }
      })

      return { site, token: rawToken }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        return reply.code(409).send({ error: '该域名已存在' })
      }
      throw error
    }
  })

  /**
   * GET /:id
   * 获取网站详情，包括访问令牌
   */
  fastify.get('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).id)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
      include: {
        tokens: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    return { site }
  })

  /**
   * PATCH /:id
   * 更新网站信息
   */
  fastify.patch('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).id)

    const parsed = updateSiteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const updated = await fastify.prisma.site.update({
      where: { id: siteId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description || null }
          : {}),
      },
    })

    return { site: updated }
  })

  /**
   * DELETE /:id
   * 删除网站及其所有相关数据
   */
  fastify.delete('/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).id)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    await fastify.prisma.site.delete({
      where: { id: siteId },
    })

    return { success: true }
  })

  /**
   * POST /:id/tokens
   * 为网站创建新访问令牌
   */
  fastify.post('/:id/tokens', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as SiteParams).id)
    const parsed = createTokenSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }
    const { name, description } = parsed.data

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const created = await fastify.prisma.siteToken.create({
      data: {
        siteId,
        token,
        name,
        description: description || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        token: true,
        isActive: true,
        createdAt: true,
      },
    })

    return { token: created }
  })

  /**
   * PATCH /:siteId/tokens/:tokenId
   * 更新访问令牌名称或描述（不修改 secret）
   */
  fastify.patch('/:siteId/tokens/:tokenId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as TokenParams).siteId)
    const tokenId = parseInt((request.params as TokenParams).tokenId)

    const parsed = updateTokenSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.format() })
    }

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    const existing = await fastify.prisma.siteToken.findFirst({
      where: { id: tokenId, siteId },
      select: tokenMetaSelect,
    })

    if (!existing) {
      return reply.code(404).send({ error: '令牌不存在' })
    }

    const data: { name?: string; description?: string | null } = {}
    if (parsed.data.name !== undefined) {
      data.name = parsed.data.name
    }
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description === '' ? null : parsed.data.description
    }

    // 无任何字段或内容与现有一致：不写库，避免 Prisma「data 不能为空」并保证未改也能 200
    const unchanged =
      Object.keys(data).length === 0 ||
      (data.name === undefined || data.name === existing.name) &&
        (data.description === undefined || data.description === existing.description)

    if (unchanged) {
      return { token: existing }
    }

    const updated = await fastify.prisma.siteToken.update({
      where: { id: tokenId, siteId },
      data,
      select: tokenMetaSelect,
    })

    return { token: updated }
  })

  /**
   * DELETE /:siteId/tokens/:tokenId
   * 撤销（删除）访问令牌
   */
  fastify.delete('/:siteId/tokens/:tokenId', { onRequest: [fastify.authenticate] }, async (request, reply) => {
    const { userId } = request.user as UserPayload
    const siteId = parseInt((request.params as TokenParams).siteId)
    const tokenId = parseInt((request.params as TokenParams).tokenId)

    const site = await fastify.prisma.site.findFirst({
      where: { id: siteId, userId },
    })

    if (!site) {
      return reply.code(404).send({ error: '网站不存在' })
    }

    await fastify.prisma.siteToken.delete({
      where: { id: tokenId, siteId },
    })

    return { success: true }
  })
}

export default sites
