import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createResources } from '../src/lib/resources.js';
import { configSchema } from '../src/lib/config.js';
import { metrics, pages, referrers, trend } from '../src/modules/stats.js';

const config = configSchema.parse(process.env);
assert.match(
  new URL(config.DATABASE_URL).pathname,
  /^\/litetrack_test(?:$|_)/,
  '仅允许独立测试库',
);
const { db, redis } = createResources(config);
const user = await db.user.create({
  data: { githubId: randomUUID(), username: 'performance' },
});
try {
  const site = await db.site.create({
    data: {
      userId: user.id,
      title: 'performance',
      domain: randomUUID() + '.test',
    },
  });
  const size = async () =>
    (
      await db.$queryRaw<
        { bytes: bigint }[]
      >`SELECT pg_total_relation_size('"PageviewEvent"') AS bytes`
    )[0].bytes;
  const before = await size();
  await db.$executeRaw`INSERT INTO "Session" (id, "siteId", "visitorId", "startedAt", "lastSeenAt", "entryPath", "referrerDomain") SELECT 'sample-' || ${site.id} || '-' || n, ${site.id}, 'visitor-' || n, '2026-10-01T00:00:00Z'::timestamptz, '2026-10-01T00:00:00Z'::timestamptz, '/', 'direct' FROM generate_series(0,999) AS n`;
  await db.$executeRaw`INSERT INTO "PageviewEvent" ("siteId", "eventId", "visitorId", "sessionId", path, title, "receivedAt") SELECT ${site.id}, 'sample-' || n, 'visitor-' || (n % 1000), 'sample-' || ${site.id} || '-' || (n % 1000), '/page/' || (n % 100), 'Sample page', '2026-10-01T00:00:00Z'::timestamptz + (n % 30) * interval '1 day' FROM generate_series(1,100000) AS n`;
  await db.$executeRaw`ANALYZE "PageviewEvent"`;
  const range = { start: '2026-10-01', end: '2026-10-30' };
  const tasks = {
    metrics: () => metrics(db, site.id, range),
    trend: () => trend(db, site.id, range),
    pages: () => pages(db, site.id, range, 1),
    referrers: () => referrers(db, site.id, range),
  };
  for (const [name, task] of Object.entries(tasks)) {
    const start = performance.now();
    await task();
    console.log(name + ': ' + (performance.now() - start).toFixed(1) + ' ms');
  }
  assert.deepEqual(await metrics(db, site.id, range), {
    pv: 100000,
    uv: 1000,
    visits: 1000,
  });
  const plan =
    await db.$queryRaw`EXPLAIN (ANALYZE, BUFFERS) SELECT COUNT(*), COUNT(DISTINCT "visitorId") FROM "PageviewEvent" WHERE "siteId"=${site.id} AND "receivedAt">='2026-10-10T00:00:00Z' AND "receivedAt"<'2026-10-11T00:00:00Z'`;
  console.log(JSON.stringify(plan));
  console.log(
    '100k 事件及索引增长 MiB: ' +
      (Number((await size()) - before) / 1048576).toFixed(2),
  );
} finally {
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
  redis.disconnect();
}
