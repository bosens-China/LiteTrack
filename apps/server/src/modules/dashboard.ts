import { Prisma } from '@prisma/client';
import type { DateRange, Metrics } from '@litetrack/contracts';
import type { Resources } from '../lib/resources.js';
import { boundaries, referrers, trend } from './stats.js';

export async function dashboard(
  db: Resources['db'],
  userId: number,
  range: DateRange,
) {
  const sites = await db.site.findMany({
    where: { userId },
    orderBy: { id: 'desc' },
  });
  const ids = sites.map((site) => site.id);
  const { start, end } = boundaries(range);
  const [rows, chart, sources] = await Promise.all([
    db.$queryRaw<(Metrics & { id: number })[]>(Prisma.sql`
      SELECT s.id, COUNT(e.id)::int AS pv, COUNT(DISTINCT e."visitorId")::int AS uv,
        (SELECT COUNT(*)::int FROM "Session" WHERE "siteId"=s.id AND "startedAt">=${start} AND "startedAt"<${end}) AS visits
      FROM "Site" s LEFT JOIN "PageviewEvent" e ON e."siteId"=s.id AND e."receivedAt">=${start} AND e."receivedAt"<${end}
      WHERE s."userId"=${userId} GROUP BY s.id
    `),
    trend(db, ids, range),
    referrers(db, ids, range),
  ]);
  const byId = new Map(rows.map(({ id, ...counts }) => [id, counts]));
  const projects = sites.map((site) => ({
    ...site,
    metrics: byId.get(site.id) ?? { pv: 0, uv: 0, visits: 0 },
  }));
  const overview = projects.reduce(
    (sum, project) => ({
      pv: sum.pv + project.metrics.pv,
      uv: sum.uv + project.metrics.uv,
      visits: sum.visits + project.metrics.visits,
    }),
    { pv: 0, uv: 0, visits: 0 },
  );
  return { overview, projects, trend: chart, referrers: sources };
}
