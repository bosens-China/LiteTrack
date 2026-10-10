import 'dotenv/config';
import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://127.0.0.1:26381'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少需要 32 个字符'),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  PUBLIC_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname === '/'
      );
    }, 'PUBLIC_URL 必须是 HTTP(S) 站点根地址')
    .transform((value) => new URL(value).origin)
    .default('http://localhost:8080'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  TRUST_PROXY: z.string().default(''),
  TRACK_IP_RATE_LIMIT: z.coerce.number().int().positive().default(300),
  TRACK_SITE_RATE_LIMIT: z.coerce.number().int().positive().default(6000),
});
export type Config = z.infer<typeof configSchema>;
