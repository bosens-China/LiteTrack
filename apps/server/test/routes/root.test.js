import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import rootRoute from '../../dist/routes/root.js'

test('GET / returns health payload', async (t) => {
  const app = Fastify()
  await app.register(rootRoute)
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/',
  })

  assert.equal(res.statusCode, 200)
  assert.deepEqual(JSON.parse(res.payload), {
    name: 'LiteTrack API',
    version: '1.0.0',
    status: 'ok',
  })
})
