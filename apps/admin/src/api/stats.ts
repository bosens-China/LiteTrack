import request from './request'

export interface PageView {
  path: string
  title?: string | null
  count: number
}

export interface DailyView {
  date: string
  count: number
}

export interface SiteStats {
  site: {
    id: number
    domain: string
    title: string
  }
  summary: {
    totalViews: number
    totalPages: number
  }
  dailyViews: DailyView[]
  pageViews: PageView[]
  popularPages: PageView[]
}

export interface DashboardSummaryResponse {
  summary: {
    siteCount: number
    todayViews: number
    totalViews: number
  }
}

export interface PagesResponse {
  pages: PageView[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface PagesQuery {
  page?: number
  pageSize?: number
  q?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface AnalyticsDaysQuery {
  days?: number
}

export interface VisitorsStatsResponse {
  summary: {
    totalVisitors: number
    todayVisitors: number
    days: number
  }
  dailyVisitors: DailyView[]
}

export interface DeviceBucket {
  name: string
  count: number
}

export interface DevicesStatsResponse {
  summary: {
    days: number
  }
  deviceTypes: DeviceBucket[]
  browsers: DeviceBucket[]
  operatingSystems: DeviceBucket[]
}

export interface ReadingStatsResponse {
  summary: {
    path: string | null
    days: number
    totalReaders: number
    depth25Count: number
    depth50Count: number
    depth75Count: number
    depth100Count: number
    completionRate: number
    averageDepth: number
  }
}

export interface ReadingQuery extends AnalyticsDaysQuery {
  path?: string
}

/**
 * 获取网站综合统计
 */
export function getSiteStats(siteId: number): Promise<SiteStats> {
  return request.get(`/stats/${siteId}`) as Promise<SiteStats>
}

export function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return request.get('/stats/dashboard') as Promise<DashboardSummaryResponse>
}

/**
 * 获取热门页面
 */
export function getPopularPages(siteId: number): Promise<{ popularPages: PageView[] }> {
  return request.get(`/stats/${siteId}/popular`) as Promise<{ popularPages: PageView[] }>
}

/**
 * 获取访问趋势
 * @param days 天数，默认 30
 */
export function getTrend(siteId: number, days?: number): Promise<{ dailyViews: DailyView[] }> {
  return request.get(`/stats/${siteId}/trend`, { params: { days } }) as Promise<{ dailyViews: DailyView[] }>
}

/**
 * 获取所有页面统计（分页）
 */
export function getSitePages(siteId: number, query?: PagesQuery): Promise<PagesResponse> {
  return request.get(`/stats/${siteId}/pages`, { params: query }) as Promise<PagesResponse>
}

/**
 * 获取访客统计
 */
export function getVisitorsStats(
  siteId: number,
  query?: AnalyticsDaysQuery,
): Promise<VisitorsStatsResponse> {
  return request.get(`/stats/${siteId}/visitors`, { params: query }) as Promise<VisitorsStatsResponse>
}

/**
 * 获取设备分布统计
 */
export function getDeviceStats(siteId: number, query?: AnalyticsDaysQuery): Promise<DevicesStatsResponse> {
  return request.get(`/stats/${siteId}/devices`, { params: query }) as Promise<DevicesStatsResponse>
}

/**
 * 获取阅读完成度统计
 */
export function getReadingStats(siteId: number, query?: ReadingQuery): Promise<ReadingStatsResponse> {
  return request.get(`/stats/${siteId}/reading`, { params: query }) as Promise<ReadingStatsResponse>
}

// 访问日志相关类型
export interface AccessLog {
  id: number
  path: string
  title: string | null
  ip: string | null
  userAgent: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  referer: string | null
  createdAt: string
}

export interface AccessLogsResponse {
  logs: AccessLog[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface LogsQuery {
  page?: number
  pageSize?: number
  path?: string
  startDate?: string
  endDate?: string
}

/**
 * 获取访问日志（分页）
 */
export function getAccessLogs(siteId: number, query?: LogsQuery): Promise<AccessLogsResponse> {
  return request.get(`/stats/${siteId}/logs`, { params: query }) as Promise<AccessLogsResponse>
}
