import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import trackRoutes from '../../dist/routes/track/index.js'

function createTrackApp(options = {}) {
  const app = Fastify()

  const calls = {
    accessLogCreate: [],
    dailyVisitorCreateMany: [],
    pageDailyVisitorCreateMany: [],
    pageReadProgressCreate: [],
    pageReadProgressUpdate: [],
  }

  const existingReadProgress = options.existingReadProgress ?? { id: 1, maxDepth: 50 }

  app.decorate('checkRateLimit', async () => true)
  app.decorate('prisma', {
    siteToken: {
      findUnique: async () => ({
        siteId: 1,
        isActive: true,
      }),
    },
    pageView: {
      upsert: async () => undefined,
    },
    dailyView: {
      upsert: async () => undefined,
    },
    dailyVisitor: {
      createMany: async (payload) => {
        calls.dailyVisitorCreateMany.push(payload)
      },
    },
    pageDailyVisitor: {
      createMany: async (payload) => {
        calls.pageDailyVisitorCreateMany.push(payload)
      },
    },
    accessLog: {
      create: async (payload) => {
        calls.accessLogCreate.push(payload)
      },
    },
    pageReadProgress: {
      findUnique: async () => existingReadProgress,
      create: async (payload) => {
        calls.pageReadProgressCreate.push(payload)
      },
      update: async (payload) => {
        calls.pageReadProgressUpdate.push(payload)
      },
    },
  })

  void app.register(trackRoutes, { prefix: '/track' })

  return { app, calls }
}

test('POST /track stores visitor identity and parsed device info', async (t) => {
  const { app, calls } = createTrackApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'POST',
    url: '/track',
    headers: {
      'x-site-token': 'site-token',
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      referer: 'https://example.com/posts',
    },
    payload: {
      path: '/posts/1',
      title: '文章 1',
      visitorId: 'visitor-1',
      sessionId: 'session-1',
    },
  })

  assert.equal(res.statusCode, 200)
  assert.equal(calls.dailyVisitorCreateMany.length, 1)
  assert.equal(calls.pageDailyVisitorCreateMany.length, 1)
  assert.equal(calls.accessLogCreate.length, 1)

  const logPayload = calls.accessLogCreate[0]
  assert.equal(logPayload.data.visitorId, 'visitor-1')
  assert.equal(logPayload.data.sessionId, 'session-1')
  assert.equal(logPayload.data.deviceType, 'mobile')
  assert.equal(logPayload.data.browser, 'Safari')
  assert.equal(logPayload.data.os, 'iOS')
})

test('POST /track/read-progress only updates when max depth increases', async (t) => {
  const { app, calls } = createTrackApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'POST',
    url: '/track/read-progress',
    headers: {
      'x-site-token': 'site-token',
    },
    payload: {
      path: '/posts/1',
      visitorId: 'visitor-1',
      maxDepth: 80,
    },
  })

  assert.equal(res.statusCode, 200)
  assert.equal(calls.pageReadProgressCreate.length, 0)
  assert.equal(calls.pageReadProgressUpdate.length, 1)
  assert.equal(calls.pageReadProgressUpdate[0].data.maxDepth, 80)
})
