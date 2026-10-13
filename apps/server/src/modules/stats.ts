import { Prisma } from '@prisma/client';
import type {
  DateRange,
  Metrics,
  PageRow,
  PagesResult,
  ReferrerRow,
  TrendPoint,
} from '@litetrack/contracts';
import type { Resources } from '../lib/resources.js';

export function boundaries(range: DateRange) {
  const start = new Date(range.start + 'T00:00:00+08:00');
  const end = new Date(
    new Date(range.end + 'T00:00:00+08:00').getTime() + 86400000,
  );
  return { start, end };
}
export function todayRange(now = new Date()): DateRange {
  const date = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  return { start: date, end: date };
}
export async function metrics(
  db: Resources['db'],
  siteId: number,
  range: DateRange,
): Promise<Metrics> {
  const { start, end } = boundaries(range);
  const [row] = await db.$queryRaw<Metrics[]>(Prisma.sql`
    SELECT COUNT(*)::int AS pv, COUNT(DISTINCT "visitorId")::int AS uv,
      (SELECT COUNT(*)::int FROM "Session" WHERE "siteId"=${siteId} AND "startedAt">=${start} AND "startedAt"<${end}) AS visits
    FROM "PageviewEvent" WHERE "siteId"=${siteId} AND "receivedAt">=${start} AND "receivedAt"<${end}
  `);
  return row;
}
export async function trend(
  db: Resources['db'],
  siteId: number | number[],
  range: DateRange,
): Promise<TrendPoint[]> {
  const ids = Array.isArray(siteId) ? siteId : [siteId];
  if (!ids.length) return [];
  const { start, end } = boundaries(range);
  const rows = await db.$queryRaw<TrendPoint[]>(Prisma.sql`
    SELECT to_char("receivedAt" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS pv, COUNT(DISTINCT ("siteId", "visitorId"))::int AS uv, 0::int AS visits
    FROM "PageviewEvent" WHERE "siteId" IN (${Prisma.join(ids)}) AND "receivedAt">=${start} AND "receivedAt"<${end}
    GROUP BY date ORDER BY date
  `);
  const sessions = await db.$queryRaw<
    { date: string; visits: number }[]
  >(Prisma.sql`
    SELECT to_char("startedAt" AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS date, COUNT(*)::int AS visits
    FROM "Session" WHERE "siteId" IN (${Prisma.join(ids)}) AND "startedAt">=${start} AND "startedAt"<${end} GROUP BY date
  `);
  const eventsByDate = new Map(rows.map((r) => [r.date, r]));
  const visitsByDate = new Map(sessions.map((r) => [r.date, r.visits]));
  const result: TrendPoint[] = [];
  for (let time = start.getTime(); time < end.getTime(); time += 86400000) {
    const date = todayRange(new Date(time)).start;
    result.push({
      date,
      pv: eventsByDate.get(date)?.pv ?? 0,
      uv: eventsByDate.get(date)?.uv ?? 0,
      visits: visitsByDate.get(date) ?? 0,
    });
  }
  return result;
}
export async function pages(
  db: Resources['db'],
  siteId: number,
  range: DateRange,
  page: number,
): Promise<PagesResult> {
  const { start, end } = boundaries(range);
  const filter = Prisma.sql`"siteId"=${siteId} AND "receivedAt">=${start} AND "receivedAt"<${end}`;
  const items = await db.$queryRaw<PageRow[]>(Prisma.sql`
    SELECT path, (array_agg(title ORDER BY "receivedAt" DESC) FILTER (WHERE title IS NOT NULL))[1] AS title,
      COUNT(*)::int AS pv, COUNT(DISTINCT "visitorId")::int AS uv
    FROM "PageviewEvent" WHERE ${filter} GROUP BY path ORDER BY pv DESC, path ASC LIMIT 20 OFFSET ${(page - 1) * 20}
  `);
  const [count] = await db.$queryRaw<{ total: number }[]>(
    Prisma.sql`SELECT COUNT(DISTINCT path)::int AS total FROM "PageviewEvent" WHERE ${filter}`,
  );
  return { items, total: count.total, page, pageSize: 20 };
}
export async function referrers(
  db: Resources['db'],
  siteId: number | number[],
  range: DateRange,
): Promise<ReferrerRow[]> {
  const ids = Array.isArray(siteId) ? siteId : [siteId];
  if (!ids.length) return [];
  const { start, end } = boundaries(range);
  return db.$queryRaw<ReferrerRow[]>(Prisma.sql`
    SELECT "referrerDomain" AS domain, COUNT(*)::int AS visits FROM "Session"
    WHERE "siteId" IN (${Prisma.join(ids)}) AND "startedAt">=${start} AND "startedAt"<${end}
    GROUP BY "referrerDomain" ORDER BY visits DESC, domain ASC LIMIT 20
  `);
}
