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
  JWT_SECRET: z
    .string()
    .refine((value) => value.trim().length > 0, 'JWT_SECRET 不能为空'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  GITHUB_CLIENT_ID: z.string(),
  GITHUB_CLIENT_SECRET: z.string(),
  GITHUB_CALLBACK_URL: z
    .string()
    .default('http://localhost:8080/auth/callback'),
  APP_TIMEZONE: z.string().default('Asia/Shanghai'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  TRUST_PROXY: z
    .string()
    .trim()
    .default('false')
    .refine(
      (value) => value !== '' && !Number.isFinite(Number(value)),
      'TRUST_PROXY 请使用 false、true 或可信代理 IP/CIDR；不支持数字跳数',
    ),
  TRACK_IP_RATE_LIMIT: z.coerce.number().int().positive().default(300),
  TRACK_SITE_RATE_LIMIT: z.coerce.number().int().positive().default(6000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  // 生产环境 CORS 白名单，逗号分隔，如 https://admin.example.com,https://blog.example.com
  // 不设置时允许所有来源（开发便利，生产建议配置）
  CORS_ORIGIN: z.string().default(''),
});

function parseTrustProxyValue(value: string): boolean | string {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
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
