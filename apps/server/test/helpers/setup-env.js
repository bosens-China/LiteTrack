// 单元测试始终使用假凭证；集成测试只接收显式提供的隔离数据库地址。
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgresql://review:review@127.0.0.1:1/review',
  REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:1',
  JWT_SECRET: 'test-only-jwt-secret',
  GITHUB_CLIENT_ID: 'test-only-client',
  GITHUB_CLIENT_SECRET: 'test-only-client-secret',
  GITHUB_CALLBACK_URL: 'http://localhost/auth/callback',
  APP_TIMEZONE: 'Asia/Shanghai',
  TRUST_PROXY: 'false',
  TRACK_IP_RATE_LIMIT: '300',
  TRACK_SITE_RATE_LIMIT: '6000',
});
