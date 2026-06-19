import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { parseUserAgent, validateOrigin } from '../../lib/visitor.js';
import { formatDateInTimeZone, normalizePath } from '../stats/shared.js';

const trackSchema = z.object({
  path: z.string().min(1).max(500),
  title: z.string().max(500).optional(),
  visitorId: z.string().trim().min(1).max(128).optional(),
  sessionId: z.string().trim().min(1).max(128).optional(),
  language: z.string().trim().max(20).optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
});

const readProgressSchema = z.object({
  path: z.string().min(1).max(500),
  visitorId: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128).optional(),
  maxDepth: z.coerce.number().int().min(0).max(100),
});

const durationSchema = z.object({
  path: z.string().min(1).max(500),
  visitorId: z.string().trim().min(1).max(128).optional(),
  duration: z.coerce.number().int().min(1).max(86400),
});

/** 从请求头提取令牌，不存在时直接拒绝 */
async function resolveSiteToken(
  fastify: Parameters<FastifyPluginAsync>[0],
  reply: FastifyReply,
  tokenHeader: string | string[] | undefined,
  includeSite = false,
) {
  const token = typeof tokenHeader === 'string' ? tokenHeader : undefined;
  if (!token) {
    await reply.code(401).send({ error: '缺少令牌' });
    return null;
  }

  const siteToken = (await fastify.prisma.siteToken.findUnique({
    where: { token },
    ...(includeSite ? { include: { site: true } } : {}),
  })) as
    | (Awaited<ReturnType<typeof fastify.prisma.siteToken.findUnique>> & {
        site?: { domain: string };
      })
    | null;

  if (!siteToken || !siteToken.isActive) {
    await reply.code(401).send({ error: '无效的令牌' });
    return null;
  }

  return siteToken;
}

const writeRoutes: FastifyPluginAsync = async (fastify) => {
  // ────────────────────────────────────────────────────────
  // POST /  —  页面访问（PV）上报
  // ────────────────────────────────────────────────────────
  fastify.post('/', async (request, reply) => {
    const siteToken = await resolveSiteToken(
      fastify,
      reply,
      request.headers['x-site-token'],
      true,
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site!.domain, origin)) {
      return reply.code(403).send({ error: '来源域名不匹配' });
    }

    const parsed = trackSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.format() });

    const {
      path: rawPath,
      title,
      visitorId,
      sessionId,
      language,
      utmSource,
      utmMedium,
      utmCampaign,
    } = parsed.data;
    const path = normalizePath(rawPath);
    const siteId = siteToken.siteId;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const userAgent = request.headers['user-agent'];
    const referer = request.headers['referer'];
    const visitorAgent = parseUserAgent(userAgent);

    const allowed = await fastify.checkRateLimit(ip, siteId, path, 10);
    if (!allowed) return { success: true, cached: true };

    const today = formatDateInTimeZone(new Date());

    await fastify.prisma.pageView.upsert({
      where: { siteId_path: { siteId, path } },
      create: { siteId, path, title: title || null, count: 1 },
      update: {
        count: { increment: 1 },
        ...(title !== undefined ? { title } : {}),
      },
    });

    await fastify.prisma.dailyView.upsert({
      where: { siteId_date: { siteId, date: today } },
      create: { siteId, date: today, count: 1 },
      update: { count: { increment: 1 } },
    });

    if (visitorId) {
      await Promise.all([
        fastify.prisma.dailyVisitor.createMany({
          data: [{ siteId, date: today, visitorId }],
          skipDuplicates: true,
        }),
        fastify.prisma.pageDailyVisitor.createMany({
          data: [{ siteId, path, date: today, visitorId }],
          skipDuplicates: true,
        }),
      ]);
    }

    void fastify.prisma.accessLog
      .create({
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
          language: language || null,
          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
        },
      })
      .catch(() => {});

    return { success: true };
  });

  // ────────────────────────────────────────────────────────
  // POST /read-progress  —  阅读深度上报
  // ────────────────────────────────────────────────────────
  fastify.post('/read-progress', async (request, reply) => {
    const siteToken = await resolveSiteToken(
      fastify,
      reply,
      request.headers['x-site-token'],
      true,
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site!.domain, origin)) {
      return reply.code(403).send({ error: '来源域名不匹配' });
    }

    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const allowed = await fastify.checkCountRateLimit(
      `rp:${siteToken.siteId}:${ip}`,
      120,
      60,
    );
    if (!allowed)
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });

    const parsed = readProgressSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.format() });

    const { path: rawPath, visitorId, maxDepth } = parsed.data;
    const path = normalizePath(rawPath);
    const today = formatDateInTimeZone(new Date());
    const siteId = siteToken.siteId;

    const existing = await fastify.prisma.pageReadProgress.findUnique({
      where: {
        siteId_path_date_visitorId: { siteId, path, date: today, visitorId },
      },
      select: { id: true, maxDepth: true },
    });

    if (!existing) {
      await fastify.prisma.pageReadProgress.create({
        data: { siteId, path, date: today, visitorId, maxDepth },
      });
      return { success: true };
    }

    if (maxDepth > existing.maxDepth) {
      await fastify.prisma.pageReadProgress.update({
        where: { id: existing.id },
        data: { maxDepth },
      });
    }

    return { success: true };
  });

  // ────────────────────────────────────────────────────────
  // POST /duration  —  页面停留时长上报
  // ────────────────────────────────────────────────────────
  fastify.post('/duration', async (request, reply) => {
    const siteToken = await resolveSiteToken(
      fastify,
      reply,
      request.headers['x-site-token'],
      true,
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site!.domain, origin)) {
      return reply.code(403).send({ error: '来源域名不匹配' });
    }

    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const allowed = await fastify.checkCountRateLimit(
      `dur:${siteToken.siteId}:${ip}`,
      30,
      60,
    );
    if (!allowed)
      return reply.code(429).send({ error: '请求过于频繁，请稍后再试' });

    const parsed = durationSchema.safeParse(request.body);
    if (!parsed.success)
      return reply.code(400).send({ error: parsed.error.format() });

    const { path: rawPath, visitorId, duration } = parsed.data;
    const path = normalizePath(rawPath);
    const today = formatDateInTimeZone(new Date());

    void fastify.prisma.pageDuration
      .create({
        data: {
          siteId: siteToken.siteId,
          path,
          date: today,
          visitorId: visitorId || null,
          duration,
        },
      })
      .catch(() => {});

    return { success: true };
  });
};

export default writeRoutes;
