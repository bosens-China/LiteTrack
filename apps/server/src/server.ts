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
  pluginsDir?: string;
  routesDir?: string;
  /** 公共 SDK 上报契约前缀（带版本，破坏性变更才升 v2） */
  publicApiPrefix?: string;
  /** 内部后台接口前缀（不带版本，随前端一起部署演进） */
  internalApiPrefix?: string;
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
  const pluginsDir = options.pluginsDir ?? join(__dirname, 'plugins');
  const routesDir = options.routesDir ?? join(__dirname, 'routes');
  // 按受众拆分两套接口：
  // - public：面向 SDK 的上报契约，带版本，契约稳定，破坏性变更才迁移到 v2
  // - internal：面向后台前端的接口，不带版本，与前端一起部署、可自由演进
  const publicApiPrefix = options.publicApiPrefix ?? '/litetrack/v1';
  const internalApiPrefix = options.internalApiPrefix ?? '/litetrack/api';

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
    trustProxy: options.trustProxy ?? config.TRUST_PROXY,
  });

  // 健康检查端点：不带版本，供容器 / 编排探活，与业务版本解耦
  server.get('/health', async () => ({
    name: 'LiteTrack API',
    status: 'ok',
  }));

  // 自动加载插件（共享插件，使用 fastify-plugin）
  server.register(autoload, {
    dir: pluginsDir,
  });

  // 公共 SDK 上报契约（带版本，破坏性变更才迁移到 v2）
  server.register(autoload, {
    dir: join(routesDir, 'public'),
    options: { prefix: publicApiPrefix },
    autoHooks: true,
    cascadeHooks: true,
  });

  // 内部后台接口（不带版本，与前端一起部署、可自由演进）
  server.register(autoload, {
    dir: join(routesDir, 'internal'),
    options: { prefix: internalApiPrefix },
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
