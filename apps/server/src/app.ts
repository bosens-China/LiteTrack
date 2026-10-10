import { serve } from '@hono/node-server';
import { configSchema } from './lib/config.js';
import { createResources } from './lib/resources.js';
import { buildServer } from './server.js';

const config = configSchema.parse(process.env);
const resources = createResources(config);
try {
  await resources.db.$connect();
  if (resources.redis.status !== 'ready')
    await new Promise<void>((resolve, reject) => {
      resources.redis.once('ready', resolve);
      resources.redis.once('error', reject);
    });
} catch (error) {
  resources.logger.error(
    { name: error instanceof Error ? error.name : 'UnknownError' },
    '依赖不可用，启动失败',
  );
  resources.redis.disconnect();
  await resources.db.$disconnect();
  process.exit(1);
}
const app = buildServer({ config, ...resources });
const server = serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: config.HOST,
});
resources.logger.info({ port: config.PORT }, 'LiteTrack 已启动');
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    const timer = setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => {
      void Promise.all([
        resources.db.$disconnect(),
        resources.redis.quit(),
      ]).then(() => {
        clearTimeout(timer);
        process.exit(0);
      });
    });
  });
}
