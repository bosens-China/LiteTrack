import type { FastifyPluginAsync } from 'fastify';
import readRoutes from '../../../modules/track/read-routes.js';
import writeRoutes from '../../../modules/track/write-routes.js';
import { config } from '../../../lib/config.js';

const track: FastifyPluginAsync = async (fastify) => {
  // 在读取请求体、查询令牌之前拦截；轮换 path、token 或 visitorId 均不能绕过。
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    const allowed = await fastify.checkCountRateLimit(
      `track:ip:${request.ip}`,
      config.TRACK_IP_RATE_LIMIT,
      60,
    );
    if (!allowed) {
      return reply
        .code(429)
        .header('Retry-After', '60')
        .send({ error: '请求过于频繁，请稍后再试' });
    }
  });
  await fastify.register(writeRoutes);
  await fastify.register(readRoutes);
};

export default track;
