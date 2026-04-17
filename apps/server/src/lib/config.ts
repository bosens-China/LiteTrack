import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * 环境变量 Schema 验证
 * 使用 Zod 进行类型安全的环境变量解析
 */
const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('30d'),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z
    .string()
    .default('http://localhost:8080/auth/callback'),
  APP_TIMEZONE: z.string().default('Asia/Shanghai'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  TRUST_PROXY: z.string().default('false'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

function parseTrustProxyValue(value: string): boolean | string | number {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  const numeric = Number(value)
  if (Number.isInteger(numeric) && value.trim() !== '') {
    return numeric
  }

  return value
}

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ 环境变量无效:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  ...parsed.data,
  TRUST_PROXY: parseTrustProxyValue(parsed.data.TRUST_PROXY),
};
