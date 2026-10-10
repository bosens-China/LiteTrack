import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { normalizePath } from '@litetrack/contracts/path';
import type { CollectInput } from '@litetrack/contracts';
import type { Resources } from '../lib/resources.js';

export function referrerDomain(
  value: string | undefined,
  siteDomain: string,
): string {
  try {
    const url = new URL(value || '');
    if (!['http:', 'https:'].includes(url.protocol)) return 'direct';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const siteHost = new URL('https://' + siteDomain).hostname.replace(
      /^www\./,
      '',
    );
    return host === siteHost ? 'direct' : host;
  } catch {
    return 'direct';
  }
}
export async function collect(
  db: Resources['db'],
  site: { id: number; domain: string },
  input: CollectInput,
  at?: Date,
) {
  try {
    return await db.$transaction(
      async (tx) => {
        // 同一访客多标签页只产生一个会话；锁随事务提交/回滚自动释放。
        const lockKey = site.id + ':' + input.visitorId;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text`;
        const existing = await tx.pageviewEvent.findUnique({
          where: {
            siteId_eventId: { siteId: site.id, eventId: input.eventId },
          },
        });
        if (existing) return { duplicate: true };
        const now = at ?? new Date();
        const path = normalizePath(input.path);
        const visitor = await tx.visitor.findUnique({
          where: {
            siteId_visitorId: { siteId: site.id, visitorId: input.visitorId },
          },
        });
        const continued =
          visitor?.currentSessionId &&
          now.getTime() - visitor.lastSeenAt.getTime() < 30 * 60 * 1000;
        const sessionId = continued ? visitor.currentSessionId! : randomUUID();
        if (continued) {
          await tx.session.update({
            where: { id: sessionId },
            data: { lastSeenAt: now },
          });
        } else {
          await tx.session.create({
            data: {
              id: sessionId,
              siteId: site.id,
              visitorId: input.visitorId,
              startedAt: now,
              lastSeenAt: now,
              entryPath: path,
              referrerDomain: referrerDomain(input.referrer, site.domain),
            },
          });
        }
        await tx.visitor.upsert({
          where: {
            siteId_visitorId: { siteId: site.id, visitorId: input.visitorId },
          },
          create: {
            siteId: site.id,
            visitorId: input.visitorId,
            currentSessionId: sessionId,
            lastSeenAt: now,
          },
          update: { currentSessionId: sessionId, lastSeenAt: now },
        });
        await tx.pageviewEvent.create({
          data: {
            siteId: site.id,
            eventId: input.eventId,
            visitorId: input.visitorId,
            sessionId,
            path,
            title: input.title,
            receivedAt: now,
          },
        });
        return { duplicate: false };
      },
      { timeout: 10000, maxWait: 5000 },
    );
  } catch (error) {
    // 同一 eventId 携带不同访客并发到达时，唯一键仍保证整个事务只提交一次。
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await db.pageviewEvent.findUnique({
        where: { siteId_eventId: { siteId: site.id, eventId: input.eventId } },
      });
      if (existing) return { duplicate: true };
    }
    throw error;
  }
}
