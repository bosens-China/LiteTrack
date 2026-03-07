import request from './request'

export interface PageView {
  path: string
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

/**
 * 获取网站综合统计
 */
export function getSiteStats(siteId: number): Promise<SiteStats> {
  return request.get(`/stats/${siteId}`) as Promise<SiteStats>
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
