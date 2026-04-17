import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import statsRoutes from '../../dist/routes/stats/index.js'

function createStatsApp() {
  const app = Fastify()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.decorate('authenticate', async (request) => {
    request.user = {
      userId: 1,
      githubId: 'github-user-1',
      username: 'tester',
    }
  })

  const pageViews = Array.from({ length: 50 }, (_, index) => ({
    path: `/posts/${index + 1}`,
    title: `文章 ${index + 1}`,
    count: 500 - index,
  }))

  app.decorate('prisma', {
    site: {
      count: async () => 2,
      findMany: async () => [{ id: 1 }, { id: 2 }],
      findFirst: async () => ({
        id: 1,
        userId: 1,
        domain: 'example.com',
        title: 'Example',
      }),
    },
    pageView: {
      aggregate: async () => ({
        _sum: { count: 4096 },
      }),
      count: async () => 57,
      findMany: async () => pageViews,
    },
    dailyView: {
      aggregate: async () => ({
        _sum: { count: 256 },
      }),
      findMany: async () => [
        {
          date: '2026-04-17',
          count: 12,
        },
      ],
    },
    accessLog: {
      groupBy: async ({ by }) => {
        if (by[0] === 'deviceType') {
          return [
            { deviceType: 'mobile', _count: { _all: 9 } },
            { deviceType: 'desktop', _count: { _all: 4 } },
          ]
        }

        if (by[0] === 'browser') {
          return [
            { browser: 'Chrome', _count: { _all: 7 } },
            { browser: 'Safari', _count: { _all: 3 } },
          ]
        }

        return [
          { os: 'iOS', _count: { _all: 6 } },
          { os: 'Windows', _count: { _all: 5 } },
        ]
      },
      count: async () => 0,
      findMany: async () => [
        {
          id: 101,
          path: '/posts/1',
          title: '文章 1',
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          deviceType: 'mobile',
          browser: 'Safari',
          os: 'iOS',
          referer: 'https://example.com/',
          createdAt: '2026-04-17T08:00:00.000Z',
        },
      ],
    },
    dailyVisitor: {
      groupBy: async ({ by }) => {
        if (by[0] === 'date') {
          return [
            { date: '2026-04-15', _count: { _all: 2 } },
            { date: '2026-04-16', _count: { _all: 3 } },
            { date: '2026-04-17', _count: { _all: 3 } },
          ]
        }

        return [
          { visitorId: 'visitor-1' },
          { visitorId: 'visitor-2' },
          { visitorId: 'visitor-3' },
          { visitorId: 'visitor-4' },
        ]
      },
      count: async () => 3,
    },
    pageReadProgress: {
      count: async ({ where }) => {
        const threshold = where?.maxDepth?.gte
        if (threshold === 100) return 1
        if (threshold === 75) return 2
        if (threshold === 50) return 3
        if (threshold === 25) return 4
        return 5
      },
      aggregate: async () => ({
        _avg: { maxDepth: 68 },
      }),
    },
  })

  void app.register(statsRoutes, { prefix: '/stats' })

  return app
}

test('GET /stats/:siteId returns full totalPages instead of truncated list length', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.summary.totalViews, 4096)
  assert.equal(payload.summary.totalPages, 57)
  assert.equal(payload.pageViews.length, 50)
})

test('GET /stats/dashboard returns aggregated site summary', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/dashboard',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.summary.siteCount, 2)
  assert.equal(payload.summary.todayViews, 256)
  assert.equal(payload.summary.totalViews, 4096)
})

test('GET /stats/:siteId/pages rejects unsupported sort field', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/pages?sortBy=createdAt&sortOrder=desc',
  })

  assert.equal(res.statusCode, 400)
  assert.equal(JSON.parse(res.payload).code, 'FST_ERR_VALIDATION')
})

test('GET /stats/:siteId/popular includes title for top pages', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/popular',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.popularPages[0].title, '文章 1')
  assert.equal(payload.popularPages[0].path, '/posts/1')
})

test('GET /stats/:siteId/visitors returns UV summary and trend', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/visitors?days=7',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.summary.totalVisitors, 4)
  assert.equal(payload.summary.todayVisitors, 3)
  assert.equal(payload.summary.days, 7)
  assert.equal(payload.dailyVisitors.length, 3)
})

test('GET /stats/:siteId/devices returns aggregated device buckets', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/devices?days=30',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.deepEqual(payload.deviceTypes[0], { name: 'mobile', count: 9 })
  assert.deepEqual(payload.browsers[0], { name: 'Chrome', count: 7 })
  assert.deepEqual(payload.operatingSystems[0], { name: 'iOS', count: 6 })
})

test('GET /stats/:siteId/reading returns reading completion summary', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/reading?days=30&path=/posts/1',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.summary.path, '/posts/1')
  assert.equal(payload.summary.totalReaders, 5)
  assert.equal(payload.summary.depth75Count, 2)
  assert.equal(payload.summary.averageDepth, 68)
  assert.equal(payload.summary.completionRate, 0.4)
})

test('GET /stats/:siteId/logs returns persisted device fields', async (t) => {
  const app = createStatsApp()
  await app.ready()

  t.after(async () => {
    await app.close()
  })

  const res = await app.inject({
    method: 'GET',
    url: '/stats/1/logs?page=1&pageSize=20',
  })

  assert.equal(res.statusCode, 200)

  const payload = JSON.parse(res.payload)

  assert.equal(payload.logs[0].browser, 'Safari')
  assert.equal(payload.logs[0].os, 'iOS')
  assert.equal(payload.logs[0].deviceType, 'mobile')
})
