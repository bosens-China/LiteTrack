import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildServer } from '../../dist/server.js';

test('buildServer 暴露不带版本的健康检查端点', async (t) => {
  const app = buildServer({
    pluginsDir: join(process.cwd(), 'test/fixtures/plugins'),
    routesDir: join(process.cwd(), 'dist/routes'),
  });
  await app.ready();

  t.after(async () => {
    await app.close();
  });

  const res = await app.inject({
    method: 'GET',
    url: '/health',
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.payload), {
    name: 'LiteTrack API',
    status: 'ok',
  });
});

test('只信任指定代理，直连客户端不能伪造转发 IP', async (t) => {
  const app = buildServer({
    trustProxy: '10.0.0.1',
    pluginsDir: join(process.cwd(), 'test/fixtures/plugins'),
    routesDir: join(process.cwd(), 'dist/routes'),
  });
  t.after(() => app.close());
  app.get('/proxy-probe', (request) => ({ ip: request.ip, ips: request.ips }));
  await app.ready();
  const headers = { 'x-forwarded-for': '198.51.100.50' };
  const direct = await app.inject({
    url: '/proxy-probe',
    remoteAddress: '198.51.100.20',
    headers,
  });
  assert.deepEqual(direct.json(), {
    ip: '198.51.100.20',
    ips: ['198.51.100.20'],
  });
  const proxied = await app.inject({
    url: '/proxy-probe',
    remoteAddress: '10.0.0.1',
    headers,
  });
  assert.equal(proxied.json().ip, '198.51.100.50');
});

test('启动时拒绝数字代理跳数与空白 JWT secret', () => {
  for (const override of [{ TRUST_PROXY: '1' }, { JWT_SECRET: '   ' }]) {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "await import('./dist/lib/config.js')"],
      {
        env: { ...process.env, ...override },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(Object.keys(override)[0]));
  }
});
