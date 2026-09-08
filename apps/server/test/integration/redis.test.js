import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import redisPlugin from '../../dist/plugins/redis.js';

test(
  'Redis 原子去重、限流过期与安全释放',
  {
    skip: !process.env.TEST_REDIS_URL && '需要隔离 TEST_REDIS_URL',
  },
  async (t) => {
    const app = Fastify();
    await app.register(redisPlugin);
    const prefix = `test:${randomUUID()}`;
    const keys = ['dedup', 'count', 'legacy'].map(
      (name) => `${prefix}:${name}`,
    );
    t.after(async () => {
      await app.redis.del(...keys);
      await app.close();
    });

    const reservations = await Promise.all(
      Array.from({ length: 20 }, () => app.reservePageview(keys[0])),
    );
    assert.equal(
      reservations.filter((result) => result.status === 'reserved').length,
      1,
    );
    assert.equal(
      reservations.filter((result) => result.status === 'pending').length,
      19,
    );
    const owner = reservations.find(
      (result) => result.status === 'reserved',
    ).owner;
    assert.ok((await app.redis.ttl(keys[0])) > 0);
    await app.releasePageview(keys[0], 'wrong-owner');
    assert.notEqual(await app.redis.get(keys[0]), null);
    await app.releasePageview(keys[0], owner);
    const nextReservation = await app.reservePageview(keys[0]);
    assert.equal(nextReservation.status, 'reserved');
    await app.releasePageview(keys[0], owner);
    assert.equal(await app.redis.get(keys[0]), nextReservation.owner);
    await app.commitPageview(keys[0], owner);
    assert.equal((await app.reservePageview(keys[0])).status, 'pending');
    await app.commitPageview(keys[0], nextReservation.owner);
    assert.equal((await app.reservePageview(keys[0])).status, 'cached');
    assert.ok((await app.redis.ttl(keys[0])) > 0);

    const allowed = await Promise.all(
      Array.from({ length: 20 }, () => app.checkCountRateLimit(keys[1], 5, 60)),
    );
    assert.equal(allowed.filter(Boolean).length, 5);
    assert.ok((await app.redis.ttl(keys[1])) > 0);
    await app.redis.set(keys[2], '3');
    assert.equal(await app.checkCountRateLimit(keys[2], 5, 60), true);
    assert.ok((await app.redis.ttl(keys[2])) > 0);
    await app.redis.pexpire(keys[1], 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(await app.checkCountRateLimit(keys[1], 5, 60), true);
  },
);
