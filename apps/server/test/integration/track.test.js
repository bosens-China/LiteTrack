import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import redisPlugin from '../../dist/plugins/redis.js';
import errorHandler from '../../dist/plugins/error-handler.js';
import trackRoutes from '../../dist/routes/public/track/index.js';
import { config } from '../../dist/lib/config.js';

test(
  '真实 PostgreSQL + Redis 上报回归',
  {
    skip:
      !(process.env.TEST_DATABASE_URL && process.env.TEST_REDIS_URL) &&
      '需要隔离 TEST_DATABASE_URL / TEST_REDIS_URL',
  },
  async (t) => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    const app = Fastify();
    app.decorate('prisma', prisma);
    await app.register(redisPlugin);
    await app.register(errorHandler);
    await app.register(trackRoutes, { prefix: '/track' });
    const user = await prisma.user.create({
      data: { githubId: randomUUID(), username: 'review-test' },
    });
    const token = randomUUID();
    const site = await prisma.site.create({
      data: {
        userId: user.id,
        domain: 'example.com',
        title: 'test',
        tokens: { create: { token } },
      },
    });
    const redisKeys = new Set([
      `track:site:${site.id}`,
      'track:ip:198.51.100.200',
    ]);
    const reserve = app.reservePageview;
    app.reservePageview = async (key) => {
      redisKeys.add(key);
      return reserve(key);
    };
    t.after(async () => {
      await prisma.user.delete({ where: { id: user.id } });
      await app.redis.del(...redisKeys);
      await app.close();
      await prisma.$disconnect();
      await pool.end();
    });
    const send = (payload, url = '/track', headers = {}) =>
      app.inject({
        method: 'POST',
        url,
        remoteAddress: '198.51.100.200',
        headers: {
          'x-site-token': token,
          origin: 'https://example.com',
          ...headers,
        },
        payload,
      });

    await t.test('并发重复 PV 只提交一次，仍兼容未知字段', async () => {
      const payload = {
        path: '/parallel',
        visitorId: 'parallel',
        futureField: 'ignored',
      };
      const results = await Promise.all(
        Array.from({ length: 20 }, () => send(payload)),
      );
      assert.ok(
        results.every((result) => [200, 503].includes(result.statusCode)),
      );
      assert.equal(
        results.filter(
          (result) => result.statusCode === 200 && !result.json().cached,
        ).length,
        1,
      );
      assert.deepEqual((await send(payload)).json(), {
        success: true,
        cached: true,
      });
      const page = await prisma.pageView.findUnique({
        where: { siteId_path: { siteId: site.id, path: '/parallel' } },
      });
      assert.equal(page.count, 1);
      assert.equal(
        await prisma.accessLog.count({
          where: { siteId: site.id, path: '/parallel' },
        }),
        1,
      );
    });

    await t.test('共享出口 IP 的两个访客分别计入 PV、UV 和日志', async () => {
      for (const visitorId of ['nat-A', 'nat-B']) {
        assert.equal((await send({ path: '/nat', visitorId })).statusCode, 200);
      }
      assert.equal(
        await prisma.dailyVisitor.count({
          where: { siteId: site.id, visitorId: { in: ['nat-A', 'nat-B'] } },
        }),
        2,
      );
      assert.equal(
        await prisma.accessLog.count({
          where: { siteId: site.id, path: '/nat' },
        }),
        2,
      );
    });

    await t.test(
      '处理中重复请求不报成功，写入失败回滚所有统计且可重试',
      async () => {
        const totalBefore = await prisma.dailyView.aggregate({
          where: { siteId: site.id },
          _sum: { count: true },
        });
        const originalTransaction = prisma.$transaction.bind(prisma);
        let entered;
        const writing = new Promise((resolve) => {
          entered = resolve;
        });
        let release;
        const failWrite = new Promise((resolve) => {
          release = resolve;
        });
        prisma.$transaction = (callback, options) =>
          originalTransaction(async (tx) => {
            tx.accessLog.create = async () => {
              entered();
              await failWrite;
              throw new Error('simulated access log failure');
            };
            return callback(tx);
          }, options);
        const payload = { path: '/rollback', visitorId: 'rollback' };
        let response;
        try {
          const first = Promise.resolve(send(payload));
          await writing;
          const duplicate = await send(payload);
          assert.equal(duplicate.statusCode, 503);
          assert.equal(duplicate.json().success, undefined);
          release();
          response = await first;
        } finally {
          release();
          prisma.$transaction = originalTransaction;
        }
        assert.equal(response.statusCode, 500);
        assert.equal(
          await prisma.pageView.count({
            where: { siteId: site.id, path: '/rollback' },
          }),
          0,
        );
        assert.equal(
          await prisma.dailyVisitor.count({
            where: { siteId: site.id, visitorId: 'rollback' },
          }),
          0,
        );
        assert.equal(
          await prisma.pageDailyVisitor.count({
            where: { siteId: site.id, path: '/rollback' },
          }),
          0,
        );
        assert.deepEqual(
          await prisma.dailyView.aggregate({
            where: { siteId: site.id },
            _sum: { count: true },
          }),
          totalBefore,
        );
        response = await send(payload);
        assert.equal(response.statusCode, 200);
        assert.equal(response.json().cached, undefined);
        assert.equal(
          await prisma.accessLog.count({
            where: { siteId: site.id, path: '/rollback' },
          }),
          1,
        );
      },
    );

    await t.test('首次并发阅读上报成功且最大深度只增不减', async () => {
      redisKeys.add(`rp:${site.id}:198.51.100.200`);
      const values = [25, 100, 50, 75, 10, 90];
      const results = await Promise.all(
        values.map((maxDepth) =>
          send(
            { path: '/read', visitorId: 'reader', maxDepth },
            '/track/read-progress',
          ),
        ),
      );
      assert.ok(results.every((result) => result.statusCode === 200));
      const rows = await prisma.pageReadProgress.findMany({
        where: { siteId: site.id, path: '/read' },
      });
      assert.equal(rows.length, 1);
      assert.equal(rows[0].maxDepth, 100);
      await send(
        { path: '/read', visitorId: 'reader', maxDepth: 5 },
        '/track/read-progress',
      );
      assert.equal(
        (
          await prisma.pageReadProgress.findUnique({
            where: { id: rows[0].id },
          })
        ).maxDepth,
        100,
      );
    });

    await t.test('时长成功响应时记录已提交，失败返回 500', async () => {
      redisKeys.add(`dur:${site.id}:198.51.100.200`);
      assert.equal(
        (await send({ path: '/duration', duration: 60 }, '/track/duration'))
          .statusCode,
        200,
      );
      assert.equal(
        await prisma.pageDuration.count({
          where: { siteId: site.id, path: '/duration' },
        }),
        1,
      );
      const original = prisma.pageDuration.create;
      prisma.pageDuration.create = async () => {
        throw new Error('simulated duration failure');
      };
      try {
        assert.equal(
          (await send({ path: '/duration', duration: 60 }, '/track/duration'))
            .statusCode,
          500,
        );
      } finally {
        prisma.pageDuration.create = original;
      }
    });

    await t.test('路径轮换触发 IP 总量限制，拒绝时不查询数据库', async () => {
      await app.redis.del('track:ip:198.51.100.200');
      const oldLimit = config.TRACK_IP_RATE_LIMIT;
      config.TRACK_IP_RATE_LIMIT = 2;
      try {
        assert.equal((await send({ path: '/limit-1' })).statusCode, 200);
        assert.equal((await send({ path: '/limit-2' })).statusCode, 200);
        const original = prisma.siteToken.findUnique;
        prisma.siteToken.findUnique = async () => {
          throw new Error('must not query');
        };
        try {
          const result = await send({ path: '/limit-3' }, '/track', {
            'x-forwarded-for': '203.0.113.9',
          });
          assert.equal(result.statusCode, 429);
          assert.equal(result.headers['retry-after'], '60');
        } finally {
          prisma.siteToken.findUnique = original;
        }
      } finally {
        config.TRACK_IP_RATE_LIMIT = oldLimit;
      }
    });

    await t.test('同站点轮换访客仍受到站点总量限制', async () => {
      await app.redis.del(`track:site:${site.id}`);
      const oldLimit = config.TRACK_SITE_RATE_LIMIT;
      config.TRACK_SITE_RATE_LIMIT = 1;
      try {
        assert.equal(
          (await send({ path: '/site-1', visitorId: 'one' })).statusCode,
          200,
        );
        assert.equal(
          (await send({ path: '/site-2', visitorId: 'two' })).statusCode,
          429,
        );
      } finally {
        config.TRACK_SITE_RATE_LIMIT = oldLimit;
      }
    });

    await t.test('无效令牌和错误 Origin 不写入统计', async () => {
      await app.redis.del(`track:site:${site.id}`);
      assert.equal(
        (
          await send({ path: '/unauthorized' }, '/track', {
            'x-site-token': 'invalid',
          })
        ).statusCode,
        401,
      );
      assert.equal(
        (
          await send({ path: '/unauthorized' }, '/track', {
            origin: 'https://wrong.example',
          })
        ).statusCode,
        403,
      );
      assert.equal(
        await prisma.pageView.count({
          where: { siteId: site.id, path: '/unauthorized' },
        }),
        0,
      );
    });
  },
);
