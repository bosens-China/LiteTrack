import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { collect } from '../src/modules/collect.js';
import { metrics, pages, referrers, trend } from '../src/modules/stats.js';
import { createResources } from '../src/lib/resources.js';
import { configSchema } from '../src/lib/config.js';
import { buildServer } from '../src/server.js';

const database = process.env.TEST_DATABASE_URL;
describe.skipIf(!database)('真实 PostgreSQL / Redis', () => {
  const config = configSchema.parse({
    NODE_ENV: 'test',
    DATABASE_URL: database || 'unused',
    REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:26380/15',
    JWT_SECRET: 'test-secret-'.repeat(4),
    GITHUB_CLIENT_ID: 'test-client',
    GITHUB_CLIENT_SECRET: 'test-secret',
  });
  if (
    database &&
    !/^\/litetrack_test(?:$|[_?])/.test(new URL(config.DATABASE_URL).pathname)
  )
    throw new Error('集成测试必须使用 litetrack_test 数据库');
  let resources: ReturnType<typeof createResources>;
  let app: ReturnType<typeof buildServer>;
  let site: { id: number; domain: string };
  let userId: number;
  let cookie: string;
  const token = 'a'.repeat(64);
  const range = { start: '2026-10-10', end: '2026-10-10' };
  const event = (visitorId: string, path = '/') => ({
    protocolVersion: 1 as const,
    eventId: randomUUID(),
    visitorId,
    path,
    referrer: 'https://github.com/link',
  });
  beforeAll(async () => {
    resources = createResources(config);
    app = buildServer({ config, ...resources });
    if (resources.redis.status !== 'ready')
      await new Promise<void>((resolve, reject) => {
        resources.redis.once('ready', resolve);
        resources.redis.once('error', reject);
      });
    await resources.redis.del('rate:ip:127.0.0.1');
    const user = await resources.db.user.create({
      data: { githubId: randomUUID(), username: 'integration' },
    });
    userId = user.id;
    site = await resources.db.site.create({
      data: {
        userId,
        title: '测试',
        domain: 'blog.example.com',
        tokens: { create: { token, name: '测试' } },
      },
    });
    cookie =
      'lt_session=' +
      (await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(String(user.id))
        .setIssuer('litetrack')
        .setAudience('admin')
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(config.JWT_SECRET)));
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    if (userId) await resources.db.user.delete({ where: { id: userId } });
    await resources.db.$disconnect();
    await resources.redis.quit();
  });
  it('固定 10 PV / 2 UV / 3 Visits，重复与来源一致', async () => {
    const first = event('visitor-first');
    await collect(resources.db, site, first, new Date('2026-10-10T01:00:00Z'));
    for (let i = 1; i < 5; i++)
      await collect(
        resources.db,
        site,
        event('visitor-first', '/page-' + i),
        new Date('2026-10-10T01:01:00Z'),
      );
    for (let i = 0; i < 3; i++)
      await collect(
        resources.db,
        site,
        event('visitor-second', '/second'),
        new Date('2026-10-10T01:05:00Z'),
      );
    for (let i = 0; i < 2; i++)
      await collect(
        resources.db,
        site,
        event('visitor-first'),
        new Date('2026-10-10T03:01:00Z'),
      );
    expect(
      await collect(
        resources.db,
        site,
        first,
        new Date('2026-10-10T05:00:00Z'),
      ),
    ).toEqual({ duplicate: true });
    expect(await metrics(resources.db, site.id, range)).toEqual({
      pv: 10,
      uv: 2,
      visits: 3,
    });
    expect(await referrers(resources.db, site.id, range)).toEqual([
      { domain: 'github.com', visits: 3 },
    ]);
    const chart = await trend(resources.db, site.id, {
      start: '2026-10-09',
      end: '2026-10-11',
    });
    expect(chart.map((p) => p.pv)).toEqual([0, 10, 0]);
    const top = await pages(resources.db, site.id, range, 1);
    expect(top.items.reduce((sum, p) => sum + p.pv, 0)).toBe(10);
  });
  it('并发首次写入与重放只生成一个会话', async () => {
    const payloads = Array.from({ length: 8 }, () => event('visitor-parallel'));
    await Promise.all(
      payloads.map((input) =>
        collect(resources.db, site, input, new Date('2026-10-11T01:00:00Z')),
      ),
    );
    await Promise.all(
      Array.from({ length: 4 }, () =>
        collect(
          resources.db,
          site,
          payloads[0],
          new Date('2026-10-11T02:00:00Z'),
        ),
      ),
    );
    expect(
      await metrics(resources.db, site.id, {
        start: '2026-10-11',
        end: '2026-10-11',
      }),
    ).toEqual({ pv: 8, uv: 1, visits: 1 });
  });
  it('30 分钟边界和跨日不强制拆分，区间 UV 不累加', async () => {
    await collect(
      resources.db,
      site,
      event('visitor-midnight'),
      new Date('2026-10-11T15:59:00Z'),
    );
    await collect(
      resources.db,
      site,
      event('visitor-midnight'),
      new Date('2026-10-11T16:01:00Z'),
    );
    expect(
      await metrics(resources.db, site.id, {
        start: '2026-10-12',
        end: '2026-10-12',
      }),
    ).toEqual({ pv: 1, uv: 1, visits: 0 });
    await collect(
      resources.db,
      site,
      event('visitor-midnight'),
      new Date('2026-10-11T16:31:00Z'),
    );
    expect(
      await metrics(resources.db, site.id, {
        start: '2026-10-12',
        end: '2026-10-12',
      }),
    ).toEqual({ pv: 2, uv: 1, visits: 1 });
    expect(
      (
        await metrics(resources.db, site.id, {
          start: '2026-10-11',
          end: '2026-10-12',
        })
      ).uv,
    ).toBe(2);
  });
  it('会话创建后事件写入失败回滚，不留下空会话', async () => {
    const before = await resources.db.session.count({
      where: { siteId: site.id },
    });
    await resources.db
      .$executeRaw`ALTER TABLE "PageviewEvent" ADD CONSTRAINT test_reject_path CHECK (path <> '/rollback')`;
    try {
      await expect(
        collect(resources.db, site, event('visitor-rollback', '/rollback')),
      ).rejects.toThrow();
      expect(
        await resources.db.session.count({ where: { siteId: site.id } }),
      ).toBe(before);
      expect(
        await resources.db.visitor.count({
          where: { siteId: site.id, visitorId: 'visitor-rollback' },
        }),
      ).toBe(0);
    } finally {
      await resources.db
        .$executeRaw`ALTER TABLE "PageviewEvent" DROP CONSTRAINT test_reject_path`;
    }
  });
  it('HTTP 协议、来源、Token、归属与 CORS 校验', async () => {
    const request = (payload: unknown, origin = 'https://blog.example.com') =>
      app.request('/litetrack/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Token': token,
          Origin: origin,
        },
        body: JSON.stringify(payload),
      });
    expect(
      (await request({ ...event('visitor-http'), protocolVersion: 99 })).status,
    ).toBe(400);
    expect(
      (await request(event('visitor-http'), 'https://evil.example')).status,
    ).toBe(403);
    expect((await request(event('visitor-http'))).status).toBe(200);
    expect((await app.request('/litetrack/api/sites/' + site.id)).status).toBe(
      401,
    );
    expect(
      (
        await app.request('/litetrack/api/sites/' + site.id, {
          headers: { Cookie: cookie },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request('/litetrack/api/sites/999999', {
          headers: { Cookie: cookie },
        })
      ).status,
    ).toBe(404);
    const preflight = await app.request('/litetrack/collect', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://blog.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('*');
    await resources.db.siteToken.update({
      where: { token },
      data: { isActive: false },
    });
    expect((await request(event('visitor-http'))).status).toBe(401);
  });
  it('项目所有者可重新读取 API Key，匿名请求不能获取', async () => {
    const url = '/litetrack/api/sites/' + site.id + '/tokens';
    const response = await app.request(url, { headers: { Cookie: cookie } });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((await response.json()).data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token, name: '测试' }),
      ]),
    );
    expect((await app.request(url)).status).toBe(401);
  });
  it('OAuth state 必须绑定浏览器且只能核销一次', async () => {
    const login = await app.request('/litetrack/api/auth/github');
    const state = new URL(login.headers.get('location')!).searchParams.get(
      'state',
    )!;
    const callback =
      '/litetrack/api/auth/github/callback?state=' + state + '&code=test';
    expect((await app.request(callback)).status).toBe(400);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: 'token' })),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: 987654321, login: 'mock' })),
        ),
    );
    const result = await app.request(callback, {
      headers: { Cookie: 'lt_oauth=' + state },
    });
    expect(result.status).toBe(302);
    expect(result.headers.get('set-cookie')).toContain('HttpOnly');
    expect(
      (
        await app.request(callback, {
          headers: { Cookie: 'lt_oauth=' + state },
        })
      ).status,
    ).toBe(400);
    await resources.db.user.deleteMany({ where: { githubId: '987654321' } });
    vi.unstubAllGlobals();
  });
  it('伪造转发头不绕过 IP 限流', async () => {
    await resources.redis.set(
      'rate:ip:127.0.0.1',
      config.TRACK_IP_RATE_LIMIT,
      'EX',
      60,
    );
    const result = await app.request('/litetrack/api/sites', {
      headers: { Cookie: cookie, 'X-Forwarded-For': '8.8.8.8' },
    });
    expect(result.status).toBe(429);
    await resources.redis.del('rate:ip:127.0.0.1');
  });
  it('不能访问其他用户的站点或跨来源修改', async () => {
    const other = await resources.db.user.create({
      data: {
        githubId: randomUUID(),
        username: 'other',
        sites: { create: { title: 'other', domain: 'other.example.com' } },
      },
      include: { sites: true },
    });
    try {
      for (const suffix of [
        '',
        '/tokens',
        '/overview?start=2026-10-10&end=2026-10-10',
      ])
        expect(
          (
            await app.request(
              '/litetrack/api/sites/' + other.sites[0].id + suffix,
              { headers: { Cookie: cookie } },
            )
          ).status,
        ).toBe(404);
      expect(
        (
          await app.request('/litetrack/api/sites/' + site.id, {
            method: 'DELETE',
            headers: { Cookie: cookie, Origin: 'https://evil.example' },
          })
        ).status,
      ).toBe(403);
      expect(await resources.db.site.count({ where: { id: site.id } })).toBe(1);
    } finally {
      await resources.db.user.delete({ where: { id: other.id } });
    }
  });
  it('数据库或 Redis 不可用时拒绝成功，不写入事实', async () => {
    const before = await resources.db.pageviewEvent.count();
    for (const override of [
      { DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/litetrack_test' },
      { REDIS_URL: 'redis://127.0.0.1:1' },
    ]) {
      const badConfig = { ...config, ...override };
      const broken = createResources(badConfig);
      try {
        const failedApp = buildServer({ config: badConfig, ...broken });
        const result = await failedApp.request('/litetrack/collect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Site-Token': token,
          },
          body: JSON.stringify(event('visitor-outage')),
        });
        expect(result.status).toBe(503);
        expect((await failedApp.request('/health')).status).toBe(503);
      } finally {
        broken.redis.disconnect();
        await broken.db.$disconnect();
      }
    }
    expect(await resources.db.pageviewEvent.count()).toBe(before);
  });
});
