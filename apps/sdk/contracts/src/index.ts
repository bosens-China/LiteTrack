import { z } from 'zod';
import { PROTOCOL_VERSION } from './protocol';
export { PROTOCOL_VERSION } from './protocol';

export const collectSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  eventId: z.string().min(8).max(100),
  visitorId: z.string().min(8).max(100),
  path: z.string().trim().min(1).max(500),
  title: z.string().max(500).optional(),
  referrer: z.string().max(2048).optional(),
});
export type CollectInput = z.infer<typeof collectSchema>;

export const siteInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((value) => value.toLowerCase())
    .refine((value) => {
      try {
        return (
          new URL(`https://${value}`).host === value && !/[\s/?#@]/.test(value)
        );
      } catch {
        return false;
      }
    }, '请输入域名，不包含协议和路径'),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(''),
});
export type SiteInput = z.infer<typeof siteInputSchema>;
export const tokenInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
export const tokenUpdateSchema = z.object({ isActive: z.boolean() });
export const idSchema = z.object({
  id: z.coerce.number().int().positive().max(2147483647),
});
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      value >= '1970-01-01' &&
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, '日期无效');
export const rangeSchema = z
  .object({ start: dateSchema, end: dateSchema })
  .refine(({ start, end }) => {
    const days = (Date.parse(end) - Date.parse(start)) / 86400000;
    return days >= 0 && days < 366;
  }, '日期范围不能超过 366 天');
export type DateRange = z.infer<typeof rangeSchema>;
export const pagesQuerySchema = z
  .object({
    start: dateSchema,
    end: dateSchema,
    page: z.coerce.number().int().positive().max(1000000).default(1),
  })
  .refine(
    ({ start, end }) => rangeSchema.safeParse({ start, end }).success,
    '日期范围无效',
  );

export * from './responses';
