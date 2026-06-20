import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
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
