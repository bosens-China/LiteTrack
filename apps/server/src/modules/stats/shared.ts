import type { FastifyInstance } from 'fastify'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import { z } from 'zod'
import { config } from '../../lib/config.js'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

export const siteParamsSchema = z.object({
  siteId: z.coerce.number().int().positive(),
})

export const daysQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export const pagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  sortBy: z.enum(['count', 'path', 'title']).default('count'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const readingQuerySchema = daysQuerySchema.extend({
  path: z.string().trim().min(1).max(500).optional(),
})

export const logsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  path: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
})

export function formatDateInTimeZone(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: config.APP_TIMEZONE }).format(date)
}

export function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }

  return path
}

export function getDateDaysAgo(days: number): string {
  return dayjs().tz(config.APP_TIMEZONE).subtract(days - 1, 'day').format('YYYY-MM-DD')
}

export function getDateBoundary(days: number, boundary: 'start' | 'end'): Date {
  const zonedNow = dayjs().tz(config.APP_TIMEZONE)
  const target = zonedNow.subtract(days - 1, 'day')

  return target[boundary === 'start' ? 'startOf' : 'endOf']('day').toDate()
}

export function parseDateBoundary(dateString: string, boundary: 'start' | 'end'): Date | null {
  const validated = dayjs(dateString, 'YYYY-MM-DD', true)

  if (!validated.isValid()) {
    return null
  }

  const dateTime =
    boundary === 'start'
      ? `${dateString} 00:00:00.000`
      : `${dateString} 23:59:59.999`

  const parsed = dayjs.tz(dateTime, 'YYYY-MM-DD HH:mm:ss.SSS', config.APP_TIMEZONE)

  return parsed.isValid() ? parsed.toDate() : null
}

export async function requireOwnedSite(
  fastify: FastifyInstance,
  userId: number,
  siteId: number,
) {
  const site = await fastify.prisma.site.findFirst({
    where: { id: siteId, userId },
  })

  if (!site) {
    throw fastify.httpErrors.notFound('网站不存在')
  }

  return site
}
