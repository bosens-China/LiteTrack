import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { buildServer } from '../../dist/server.js'

test('buildServer autoloads routes with global prefix', async (t) => {
  const app = buildServer({
    pluginsDir: join(process.cwd(), 'test/fixtures/plugins'),
    routesDir: join(process.cwd(), 'dist/routes'),
  })
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/litetrack/v1/',
  })

  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.payload), {
    name: 'LiteTrack API',
    version: '1.0.0',
    status: 'ok',
  })
})
