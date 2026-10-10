import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import pino from 'pino';
import type { Config } from './config.js';

export function createResources(config: Config) {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
  });
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  const logger = pino({
    level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    redact: ['token', 'access_token', 'client_secret', 'password'],
  });
  redis.on('error', () => logger.error('Redis 连接失败'));
  return { db, redis, logger };
}
export type Resources = ReturnType<typeof createResources>;
