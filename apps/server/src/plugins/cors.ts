import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { config } from '../lib/config.js';

function resolveOrigin(): boolean | string[] {
  if (!config.CORS_ORIGIN) {
    if (config.NODE_ENV === 'production') {
      // 生产环境未配置白名单时给出警告，但仍放行（避免首次部署即故障）
      console.warn(
        '[cors] 生产环境未设置 CORS_ORIGIN，当前允许所有来源。建议在环境变量中配置白名单。',
      );
    }
    return true;
  }
  return config.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

const corsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifyCors, {
    origin: resolveOrigin(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Site-Token',
      'X-LiteTrack-SDK',
    ],
  });
};

export default fp(corsPlugin, { name: 'cors-plugin' });
