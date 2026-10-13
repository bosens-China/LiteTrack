import { z } from 'zod';

const count = z.number().int().nonnegative();
export const userSchema = z.object({
  id: count,
  username: z.string(),
  avatar: z.string().nullable(),
});
export const metricsSchema = z.object({ pv: count, uv: count, visits: count });
export const siteSchema = z.object({
  id: count,
  domain: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
});
export const siteSummarySchema = siteSchema.extend({ today: metricsSchema });
export const siteTokenSchema = z.object({
  id: count,
  token: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export const trendPointSchema = metricsSchema.extend({ date: z.string() });
export const pageRowSchema = z.object({
  path: z.string(),
  title: z.string().nullable(),
  pv: count,
  uv: count,
});
export const pagesResultSchema = z.object({
  items: pageRowSchema.array(),
  total: count,
  page: count,
  pageSize: count,
});
export const referrerRowSchema = z.object({
  domain: z.string(),
  visits: count,
});
export const dashboardSchema = z.object({
  overview: metricsSchema,
  projects: siteSchema.extend({ metrics: metricsSchema }).array(),
  trend: trendPointSchema.array(),
  referrers: referrerRowSchema.array(),
});
export const envelopeSchema = <T extends z.ZodType>(data: T) =>
  z.object({ data, message: z.string(), code: z.string() });
export type User = z.infer<typeof userSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type Site = z.infer<typeof siteSchema>;
export type SiteSummary = z.infer<typeof siteSummarySchema>;
export type SiteToken = z.infer<typeof siteTokenSchema>;
export type TrendPoint = z.infer<typeof trendPointSchema>;
export type PageRow = z.infer<typeof pageRowSchema>;
export type PagesResult = z.infer<typeof pagesResultSchema>;
export type ReferrerRow = z.infer<typeof referrerRowSchema>;
export type Dashboard = z.infer<typeof dashboardSchema>;
export interface ApiEnvelope<T> {
  data: T;
  message: string;
  code: string;
}
