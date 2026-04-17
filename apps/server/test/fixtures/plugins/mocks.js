import fp from 'fastify-plugin'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

async function mocksPlugin(fastify) {
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  fastify.decorate('authenticate', async (request) => {
    request.user = {
      userId: 1,
      githubId: 'github-user-1',
      username: 'tester',
    }
  })

  fastify.decorate('checkRateLimit', async () => true)
  fastify.decorate('jwt', {
    sign: () => 'test-token',
    verify: async () => ({
      userId: 1,
      githubId: 'github-user-1',
      username: 'tester',
    }),
  })

  fastify.decorate('prisma', {
    site: {
      count: async () => 0,
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => ({ id: 1 }),
      update: async () => ({ id: 1 }),
      delete: async () => ({ id: 1 }),
    },
    siteToken: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => ({ id: 1 }),
      update: async () => ({ id: 1 }),
      delete: async () => ({ id: 1 }),
    },
    user: {
      upsert: async () => ({ id: 1 }),
    },
    pageView: {
      aggregate: async () => ({ _sum: { count: 0 } }),
      count: async () => 0,
      findMany: async () => [],
      upsert: async () => undefined,
    },
    dailyView: {
      aggregate: async () => ({ _sum: { count: 0 } }),
      findMany: async () => [],
      upsert: async () => undefined,
    },
    accessLog: {
      groupBy: async () => [],
      count: async () => 0,
      findMany: async () => [],
      create: async () => undefined,
    },
    dailyVisitor: {
      groupBy: async () => [],
      count: async () => 0,
      createMany: async () => undefined,
    },
    pageDailyVisitor: {
      createMany: async () => undefined,
    },
    pageReadProgress: {
      count: async () => 0,
      aggregate: async () => ({ _avg: { maxDepth: 0 } }),
      findUnique: async () => null,
      create: async () => undefined,
      update: async () => undefined,
    },
  })
}

export default fp(mocksPlugin, {
  name: 'test-mocks-plugin',
})
