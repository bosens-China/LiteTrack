/**
 * LiteTrack SDK
 *
 * 默认使用官方 API 地址：
 * - 上报：POST https://litetrack.xiaowo.live/litetrack/v1/track
 * - 查询：GET  https://litetrack.xiaowo.live/litetrack/v1/track/stats
 */

const BASE_URL = 'https://litetrack.xiaowo.live';
const DEFAULT_TRACK_API_URL = `${BASE_URL}/litetrack/v1/track`;
const DEFAULT_STATS_API_URL = `${BASE_URL}/litetrack/v1/track/stats`;

interface SiteStatsResponse {
  totalViews?: number;
  totalPages?: number;
}

interface PageStatsResponse {
  path?: string;
  count?: number;
}

export interface SiteStats {
  totalViews: number;
  totalPages: number;
}

export interface PageStats {
  path: string;
  count: number;
}

/**
 * 路径归一化
 * 去除末尾斜杠，确保 /foo/ 和 /foo 视为同一个路径
 */
function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }
  return path;
}

export interface TrackOptions {
  /** 页面标题（可选，默认使用 document.title） */
  title?: string;
  /** 自定义上报地址 */
  apiUrl?: string;
}

/**
 * 上报页面访问（仅发送，不关心返回值）
 *
 * 后端要求：
 * - Header: X-Site-Token: <token>
 * - Body: { path: string, title?: string }
 *
 * @param token - 网站令牌
 * @param path - 页面路径
 * @param options - 可选配置（标题、自定义 API 地址）
 *
 * @example
 * // 基础用法
 * track('token', '/home')
 *
 * // 指定页面标题
 * track('token', '/home', { title: '首页' })
 *
 * // 指定自定义 API 地址
 * track('token', '/home', { apiUrl: 'https://custom.api.com/track' })
 *
 * // 同时指定标题和自定义地址
 * track('token', '/home', { title: '首页', apiUrl: 'https://custom.api.com/track' })
 */
export function track(token: string, path: string, options?: TrackOptions): void {
  const url = options?.apiUrl ?? DEFAULT_TRACK_API_URL;
  const pageTitle = options?.title ?? (typeof document !== 'undefined' ? document.title : undefined);

  // 自动处理路径，对用户更友好
  const safePath = normalizePath(path);

  // 注意：sendBeacon 不支持自定义 headers，所以只能用 fetch
  if (typeof fetch !== 'undefined') {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Site-Token': token,
      },
      body: JSON.stringify({ path: safePath, title: pageTitle }),
      keepalive: true,
    }).catch(() => {
      // 忽略网络错误，由调用方决定是否需要额外上报
    });
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
export async function getSiteStats(
  token: string,
  apiUrl?: string,
): Promise<SiteStats | null> {
  if (typeof fetch === 'undefined') {
    return null;
  }

  const url = apiUrl || DEFAULT_STATS_API_URL;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Site-Token': token,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SiteStatsResponse;

    return {
      totalViews: typeof data.totalViews === 'number' ? data.totalViews : 0,
      totalPages: typeof data.totalPages === 'number' ? data.totalPages : 0,
    };
  } catch {
    return null;
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
export async function getPageStats(
  token: string,
  path: string,
  apiUrl?: string,
): Promise<PageStats | null> {
  if (typeof fetch === 'undefined') {
    return null;
  }

  const baseUrl = apiUrl || DEFAULT_STATS_API_URL;
  const url = new URL(baseUrl);
  url.searchParams.set('path', path);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Site-Token': token,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as PageStatsResponse;

    return {
      path: typeof data.path === 'string' ? data.path : path,
      count: typeof data.count === 'number' ? data.count : 0,
    };
  } catch {
    return null;
  }
}
