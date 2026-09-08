import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import {
  parseGeoHeaders,
  parseUserAgent,
  validateOrigin,
} from '../../lib/visitor.js';
import { config } from '../../lib/config.js';
import { lookupGeoByIp } from '../../lib/geoip.js';
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
) {
  const token = typeof tokenHeader === 'string' ? tokenHeader : undefined;
  if (!token) {
    await reply.code(401).send({ error: '缺少令牌' });
    return null;
  }

  const siteToken = await fastify.prisma.siteToken.findUnique({
    where: { token },
    include: { site: true },
  });

  if (!siteToken || !siteToken.isActive) {
    await reply.code(401).send({ error: '无效的令牌' });
    return null;
  }

  const allowed = await fastify.checkCountRateLimit(
    `track:site:${siteToken.siteId}`,
    config.TRACK_SITE_RATE_LIMIT,
    60,
  );
  if (!allowed) {
    await reply
      .code(429)
      .header('Retry-After', '60')
      .send({ error: '请求过于频繁，请稍后再试' });
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
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site.domain, origin)) {
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
    // 地理信息：可信反代注入的头（如 Cloudflare CF-IPCountry）优先，
    // 缺失字段再用 ip2region 离线库按 IP 补全（国内省/市定位准）。
    const geoHeaders = parseGeoHeaders(
      request.headers,
      Boolean(request.ips && request.ips.length > 1),
    );
    const geoFromIp = lookupGeoByIp(ip);
    const geo = {
      country: geoHeaders.country ?? geoFromIp.country,
      city: geoHeaders.city ?? geoFromIp.city,
    };

    const today = formatDateInTimeZone(new Date());
    // 身份与 IP 分开：共享出口的不同访客不应互相去重；旧 SDK 无身份时回退 IP。
    // 纳入日期和会话，避免跨日或新会话的首次访问被上一条记录吞掉。
    const identity = visitorId
      ? ['visitor', visitorId, sessionId ?? null]
      : ['ip', ip];
    const digest = createHash('sha256')
      .update(JSON.stringify([siteId, today, path, identity]))
      .digest('hex');
    const key = `pv:${digest}`;
    const reservation = await fastify.reservePageview(key);
    if (reservation.status === 'cached') return { success: true, cached: true };
    if (reservation.status === 'pending') {
      return reply
        .code(503)
        .header('Retry-After', '1')
        .send({ error: '上报正在处理中，请稍后重试' });
    }

    try {
      await fastify.prisma.$transaction(
        async (tx) => {
          await tx.pageView.upsert({
            where: { siteId_path: { siteId, path } },
            create: { siteId, path, title: title || null, count: 1 },
            update: {
              count: { increment: 1 },
              ...(title !== undefined ? { title } : {}),
            },
          });

          await tx.dailyView.upsert({
            where: { siteId_date: { siteId, date: today } },
            create: { siteId, date: today, count: 1 },
            update: { count: { increment: 1 } },
          });

          if (visitorId) {
            await Promise.all([
              tx.dailyVisitor.createMany({
                data: [{ siteId, date: today, visitorId }],
                skipDuplicates: true,
              }),
              tx.pageDailyVisitor.createMany({
                data: [{ siteId, path, date: today, visitorId }],
                skipDuplicates: true,
              }),
            ]);
          }

          await tx.accessLog.create({
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
              country: geo.country,
              city: geo.city,
            },
          });
        },
        { maxWait: 2000, timeout: 5000 },
      ); // 总时限短于 Redis 的 10 秒预留窗口。
    } catch (error) {
      try {
        await fastify.releasePageview(key, reservation.owner);
      } catch (releaseError) {
        request.log.error({ err: releaseError }, '释放页面去重预留失败');
      }
      throw error;
    }

    try {
      await fastify.commitPageview(key, reservation.owner);
    } catch (error) {
      // 数据库已提交，不释放预留或把这次持久化成功误报为失败。
      request.log.error({ err: error }, '标记页面去重完成失败');
    }

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
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site.domain, origin)) {
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

    // 在唯一键冲突处理内比较，避免并发首次创建报错或较小值覆盖较大值。
    await fastify.prisma.$executeRaw`
      INSERT INTO page_read_progress (site_id, path, date, visitor_id, max_depth, updated_at)
      VALUES (${siteId}, ${path}, ${today}, ${visitorId}, ${maxDepth}, NOW())
      ON CONFLICT (site_id, path, date, visitor_id) DO UPDATE
      SET max_depth = EXCLUDED.max_depth, updated_at = NOW()
      WHERE page_read_progress.max_depth < EXCLUDED.max_depth
    `;

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
    );
    if (!siteToken) return;

    const origin = request.headers['origin'] as string | undefined;
    if (!validateOrigin(siteToken.site.domain, origin)) {
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

    await fastify.prisma.pageDuration.create({
      data: {
        siteId: siteToken.siteId,
        path,
        date: today,
        visitorId: visitorId || null,
        duration,
      },
    });

    return { success: true };
  });
};

export default writeRoutes;
