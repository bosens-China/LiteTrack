import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import axios, { AxiosError } from 'axios';
import { safeLoggingOptions } from '../../dist/lib/logging.js';
import authRoutes from '../../dist/routes/internal/auth/index.js';
import zodPlugin from '../../dist/plugins/zod.js';
import jwtPlugin from '../../dist/plugins/jwt.js';

test('OAuth 日志脱敏、一次性 state 和真实 JWT 鉴权', async (t) => {
  let output = '';
  const app = Fastify({
    logger: {
      ...safeLoggingOptions,
      stream: {
        write(chunk) {
          output += chunk;
        },
      },
    },
  });
  await app.register(zodPlugin);
  await app.register(jwtPlugin);
  const states = new Map();
  app.decorate('redis', {
    setex: async (key, _ttl, value) => {
      states.set(key, value);
    },
    getdel: async (key) => {
      const value = states.get(key);
      states.delete(key);
      return value;
    },
  });
  app.decorate('prisma', {
    user: {
      findUnique: async () => ({ id: 1, githubId: '1', username: 'test' }),
    },
  });
  await app.register(authRoutes, { prefix: '/auth' });
  const originalAdapter = axios.defaults.adapter;
  t.after(async () => {
    axios.defaults.adapter = originalAdapter;
    await app.close();
  });

  await t.test(
    '上游错误不泄露 client_secret / code / state / access token',
    async () => {
      axios.defaults.adapter = async (config) => {
        throw new AxiosError(
          'fixture upstream error',
          'ERR_BAD_RESPONSE',
          config,
        );
      };
      const state = 'SYNTHETIC_STATE_MARKER';
      await app.inject(`/auth/github?state=${state}`);
      const result = await app.inject(
        `/auth/github/callback?state=${state}&code=SYNTHETIC_CODE_MARKER`,
      );
      assert.equal(result.statusCode, 500);
      // 防御性脱敏也覆盖将来有人误把完整 AxiosError 传给 logger 的情况。
      const error = new AxiosError('fixture', 'ERR_NETWORK', {
        data: 'SYNTHETIC_CLIENT_SECRET',
        headers: { Authorization: 'SYNTHETIC_TOKEN' },
      });
      app.log.error(error);
      assert.ok(output.includes('ERR_BAD_RESPONSE'));
      for (const secret of [
        state,
        'SYNTHETIC_CODE_MARKER',
        'test-only-client-secret',
        'SYNTHETIC_CLIENT_SECRET',
        'SYNTHETIC_TOKEN',
      ]) {
        assert.ok(!output.includes(secret), `日志不应包含 ${secret}`);
      }
    },
  );

  await t.test('并发回调只有一次能够消费 state', async () => {
    axios.defaults.adapter = async (config) => ({
      config,
      headers: {},
      status: 200,
      statusText: 'OK',
      data: config.url.endsWith('/access_token')
        ? { access_token: 'fixture-access-token' }
        : { id: 1, login: 'test' },
    });
    const state = 'valid-single-use-state';
    await app.inject(`/auth/github?state=${state}`);
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        app.inject(`/auth/github/callback?state=${state}&code=fixture-code`),
      ),
    );
    assert.deepEqual(responses.map((res) => res.statusCode).sort(), [200, 400]);
    const signed = responses.find((res) => res.statusCode === 200).json().token;
    assert.equal(app.jwt.verify(signed).userId, 1);
    assert.equal(
      (
        await app.inject({
          url: '/auth/me',
          headers: { authorization: `Bearer ${signed}` },
        })
      ).statusCode,
      200,
    );
  });

  await t.test('缺失和伪造 JWT 均拒绝访问', async () => {
    assert.equal((await app.inject('/auth/me')).statusCode, 401);
    assert.equal(
      (
        await app.inject({
          url: '/auth/me',
          headers: { authorization: 'Bearer forged' },
        })
      ).statusCode,
      401,
    );
  });
});
