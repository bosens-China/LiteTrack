import fp from 'fastify-plugin';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { config } from '../lib/config.js';

type PageviewReservation =
  | { status: 'reserved'; owner: string }
  | { status: 'pending' }
  | { status: 'cached' };

/**
 * Redis 插件
 *
 * - 提供 Redis 客户端实例
 * - 用于速率限制和缓存
 * - 服务器关闭时断开连接
 */
async function redisPlugin(fastify: FastifyInstance) {
  const redis = new Redis(config.REDIS_URL);

  // 装饰 Fastify 实例
  fastify.decorate('redis', redis);

  fastify.decorate(
    'reservePageview',
    async (key: string): Promise<PageviewReservation> => {
      const owner = randomUUID();
      const result = await redis.eval(
        `
        local current = redis.call('GET', KEYS[1])
        if current then return current end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', 10)
        return ARGV[1]
      `,
        1,
        key,
        owner,
      );
      if (result === owner) return { status: 'reserved', owner };
      return { status: result === 'committed' ? 'cached' : 'pending' };
    },
  );

  fastify.decorate('commitPageview', async (key: string, owner: string) => {
    // 数据库提交后才允许返回缓存成功，保留从首次请求起算的去重窗口。
    await redis.eval(
      `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('SET', KEYS[1], 'committed', 'KEEPTTL')
      end
      return nil
    `,
      1,
      key,
      owner,
    );
  });

  fastify.decorate(
    'releasePageview',
    async (key: string, reservation: string) => {
      // 只释放自己的预留，避免旧请求失败时删除已过期后新请求持有的键。
      await redis.eval(
        `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
    `,
        1,
        key,
        reservation,
      );
    },
  );

  // 计数型限流：key 在 ttlSeconds 内最多允许 limit 次调用
  fastify.decorate(
    'checkCountRateLimit',
    async (
      key: string,
      limit: number,
      ttlSeconds: number,
    ): Promise<boolean> => {
      // 计数与过期设置必须原子执行；同时修复旧版本可能遗留的无 TTL 键。
      const count = await redis.eval(
        `
        local count = redis.call('INCR', KEYS[1])
        if redis.call('TTL', KEYS[1]) < 0 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        return count
      `,
        1,
        key,
        ttlSeconds,
      );
      return typeof count === 'number' && count <= limit;
    },
  );

  // 服务器关闭时清理资源
  fastify.addHook('onClose', async () => {
    fastify.log.info('closing redis connection');
    await redis.quit();
  });
}

export default fp(redisPlugin, {
  name: 'redis-plugin',
});

/**
 * 类型声明合并
 * 扩展 FastifyInstance 以包含 redis 装饰器
 */
declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
    reservePageview: (key: string) => Promise<PageviewReservation>;
    commitPageview: (key: string, owner: string) => Promise<void>;
    releasePageview: (key: string, reservation: string) => Promise<void>;
    checkCountRateLimit: (
      key: string,
      limit: number,
      ttlSeconds: number,
    ) => Promise<boolean>;
  }
}
