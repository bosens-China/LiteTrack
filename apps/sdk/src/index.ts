/**
 * LiteTrack SDK
 *
 * 默认使用官方 API 地址：
 * - 上报：POST https://api.litetrack.io/litetrack/v1/track
 * - 查询：GET  https://api.litetrack.io/litetrack/v1/track/stats
 */

const DEFAULT_TRACK_API_URL = 'https://api.litetrack.io/litetrack/v1/track'
const DEFAULT_STATS_API_URL = 'https://api.litetrack.io/litetrack/v1/track/stats'

interface SiteStatsResponse {
  totalViews?: number
  totalPages?: number
}

interface PageStatsResponse {
  path?: string
  count?: number
}

export interface SiteStats {
  totalViews: number
  totalPages: number
}

export interface PageStats {
  path: string
  count: number
}

/**
 * 上报页面访问（仅发送，不关心返回值）
 *
 * 后端要求：
 * - Header: X-Site-Token: <token>
 * - Body: { path: string }
 *
 * @param token - 网站令牌
 * @param path - 页面路径
 * @param apiUrl - 可选，自定义上报地址
 */
export function track(token: string, path: string, apiUrl?: string): void {
  const url = apiUrl || DEFAULT_TRACK_API_URL

  // 注意：sendBeacon 不支持自定义 headers，所以只能用 fetch
  if (typeof fetch !== 'undefined') {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Token': token,
      },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {
      // 忽略网络错误，由调用方决定是否需要额外上报
    })
  }
}

/**
 * 查询站点汇总数据
 *
 * - 不会抛出异常，失败时返回 null
 * - 成功时返回 totalViews / totalPages
 *
 * @param token - 网站令牌
 * @param apiUrl - 可选，自定义查询地址
 */
export async function getSiteStats(token: string, apiUrl?: string): Promise<SiteStats | null> {
  if (typeof fetch === 'undefined') {
    return null
  }

  const url = apiUrl || DEFAULT_STATS_API_URL

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Site-Token': token,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as SiteStatsResponse

    return {
      totalViews: typeof data.totalViews === 'number' ? data.totalViews : 0,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
    }
  } catch {
    return null
  }
}

/**
 * 查询指定页面的访问量
 *
 * - 不会抛出异常，失败时返回 null
 * - 成功时返回 { path, count }
 *
 * @param token - 网站令牌
 * @param path - 页面路径
 * @param apiUrl - 可选，自定义查询地址（基础地址，不含 query）
 */
export async function getPageStats(token: string, path: string, apiUrl?: string): Promise<PageStats | null> {
  if (typeof fetch === 'undefined') {
    return null
  }

  const baseUrl = apiUrl || DEFAULT_STATS_API_URL
  const url = new URL(baseUrl)
  url.searchParams.set('path', path)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Site-Token': token,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = (await response.json()) as PageStatsResponse

    return {
      path: typeof data.path === 'string' ? data.path : path,
      count: typeof data.count === 'number' ? data.count : 0,
    }
  } catch {
    return null
  }
}
