import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import autoload from '@fastify/autoload';
import closeWithGrace from 'close-with-grace';
import { config } from './lib/config.js';

// 获取当前目录（兼容 ESM 和 CommonJS）
const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * 根据环境配置 Logger
 */
const envToLogger = {
  development: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  production: {
    level: config.LOG_LEVEL,
  },
  test: {
    level: 'silent',
  },
} as const;

export interface BuildServerOptions {
  trustProxy?: boolean | string | number;
}

/**
 * 创建 Fastify 服务器实例
 *
 * 最佳实践：
 * - 使用工厂函数便于测试和复用
 * - 配置安全选项（bodyLimit、requestTimeout 等）
 * - 使用 close-with-grace 实现优雅关闭
 *
 * @see https://fastify.dev/docs/latest/Reference/Server/
 */
export function buildServer(options: BuildServerOptions = {}) {
  const server = Fastify({
    // Logger 配置
    logger: envToLogger[config.NODE_ENV],

    // 安全选项
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
    requestTimeout: 120_000, // 2 分钟
    bodyLimit: 1_048_576, // 1 MiB
    return503OnClosing: true,
    forceCloseConnections: 'idle',

    // 代理配置
    trustProxy: options.trustProxy ?? false,
  });

  // 自动加载插件（共享插件，使用 fastify-plugin）
  server.register(autoload, {
    dir: join(__dirname, 'plugins'),
  });

  // 自动加载路由（保持封装，不使用 fastify-plugin）
  server.register(autoload, {
    dir: join(__dirname, 'routes'),
    options: { prefix: '/litetrack/v1' },
    autoHooks: true,
    cascadeHooks: true,
  });

  // 优雅关闭处理
  closeWithGrace({ delay: 10_000 }, async ({ signal, err }) => {
    if (err) {
      server.log.error({ err }, 'server closing with error');
    } else {
      server.log.info(`${signal} received, server closing`);
    }
    await server.close();
  });

  return server;
}
