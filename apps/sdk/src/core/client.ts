import {
  DURATION_ENDPOINT,
  READ_PROGRESS_ENDPOINT,
  STATS_ENDPOINT,
  TRACK_ENDPOINT,
} from './constants';
import {
  getCurrentPath,
  getLanguage,
  getPageTitle,
  getUtmParams,
  isBrowser,
  normalizeBaseUrl,
  normalizePath,
} from './env';
import { createLiteTrackError } from './errors';
import { createIdentityStore } from './identity';
import { createTransport } from './transport';
import type {
  LiteTrackCreateOptions,
  PageInput,
  PageStats,
  ReadInput,
  SiteStats,
  Tracker,
} from './types';

interface SiteStatsResponse {
  totalPages?: number;
  totalViews?: number;
}

interface PageStatsResponse {
  count?: number;
  path?: string;
}

function assertCreateOptions(options: LiteTrackCreateOptions): {
  baseUrl: string;
  siteToken: string;
} {
  const siteToken = options.siteToken.trim();
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  if (!siteToken) {
    throw createLiteTrackError({
      message: 'LiteTrack.create() 需要有效的 siteToken',
      code: 'INVALID_OPTIONS',
    });
  }

  if (!baseUrl) {
    throw createLiteTrackError({
      message: 'LiteTrack.create() 需要显式传入 baseUrl',
      code: 'INVALID_OPTIONS',
    });
  }

  return { siteToken, baseUrl };
}

function parseSiteStatsResponse(response: SiteStatsResponse): SiteStats {
  return {
    totalViews:
      typeof response.totalViews === 'number' ? response.totalViews : 0,
    totalPages:
      typeof response.totalPages === 'number' ? response.totalPages : 0,
  };
}

function parsePageStatsResponse(
  response: PageStatsResponse,
  path: string,
): PageStats {
  return {
    path:
      typeof response.path === 'string' ? normalizePath(response.path) : path,
    count: typeof response.count === 'number' ? response.count : 0,
  };
}

/**
 * 创建一个 LiteTrack 追踪器实例。
 *
 * 初始化时不会自动发送任何请求，所有上报均需显式调用。
 *
 * @param options 初始化选项，`siteToken` 和 `baseUrl` 为必填项
 * @returns Tracker 实例
 *
 * @example
 * const tracker = create({
 *   siteToken: 'st_abc123',
 *   baseUrl: 'https://your-api.example.com',
 * })
 *
 * // 在路由钩子中上报页面访问
 * router.afterEach(() => tracker.page())
 */
export function create(options: LiteTrackCreateOptions): Tracker {
  const validated = assertCreateOptions(options);
  const transport = createTransport({
    baseUrl: validated.baseUrl,
    siteToken: validated.siteToken,
    debug: options.debug,
    onError: options.onError,
  });
  const identityStore = createIdentityStore(options.identity);

  let destroyed = false;
  // lastPath/pageEntryTime 仅用于停留时长 flush，不参与路径解析
  let lastPath: string | null = null;
  let pageEntryTime: number | null = null;

  const flushDuration = (): void => {
    if (lastPath === null || pageEntryTime === null) return;
    const duration = Math.round((Date.now() - pageEntryTime) / 1000);
    pageEntryTime = null;
    if (duration < 1) return;

    transport.post(DURATION_ENDPOINT, {
      path: lastPath,
      visitorId: identityStore.get().visitorId,
      duration,
    });
  };

  // beforeunload 在移动端 Safari / bfcache 常不触发，叠加 pagehide 与
  // visibilitychange(hidden) 两路兜底，确保切后台 / 关闭标签页时也能 flush。
  const handleFlushEvent = (): void => {
    if (!destroyed) flushDuration();
  };

  const handleVisibilityChange = (): void => {
    if (destroyed) return;
    if (document.visibilityState === 'hidden') {
      // 切后台：结算当前可见时段（flush 后 pageEntryTime 归零）
      flushDuration();
    } else if (lastPath !== null && pageEntryTime === null) {
      // 切回前台：重新计时，避免再次停留的时长被漏报
      pageEntryTime = Date.now();
    }
  };

  const registerUnloadListeners = (): void => {
    window.addEventListener('beforeunload', handleFlushEvent);
    window.addEventListener('pagehide', handleFlushEvent);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  };

  const removeUnloadListeners = (): void => {
    window.removeEventListener('beforeunload', handleFlushEvent);
    window.removeEventListener('pagehide', handleFlushEvent);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };

  if (isBrowser()) {
    registerUnloadListeners();
  }

  const sendPageview = (input?: PageInput): void => {
    // 每次都从当前 URL 实时读取，不使用内部缓存——SPA 路由切换后调用无需手动传 path
    const path = normalizePath(input?.path ?? getCurrentPath());

    flushDuration();

    lastPath = path;
    pageEntryTime = Date.now();

    const utmParams = getUtmParams();
    transport.post(TRACK_ENDPOINT, {
      path,
      title: getPageTitle(input?.title),
      visitorId: identityStore.get().visitorId,
      sessionId: identityStore.get().sessionId,
      language: getLanguage(),
      ...utmParams,
    });
  };

  const sendReadProgress = (input: ReadInput): void => {
    // 同样实时读取，不依赖 page() 调用留下的状态
    const path = normalizePath(input.path ?? getCurrentPath());

    const percent = Math.max(0, Math.min(100, Math.round(input.percent)));
    const identity = identityStore.get();
    transport.post(READ_PROGRESS_ENDPOINT, {
      path,
      maxDepth: percent,
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
    });
  };

  return {
    page(input) {
      if (destroyed) return;
      sendPageview(input);
    },
    read(input) {
      if (destroyed) return;
      if (typeof input === 'number') {
        sendReadProgress({ percent: input });
        return;
      }
      sendReadProgress(input);
    },
    identify(identity) {
      if (destroyed) return;
      identityStore.set(identity);
    },
    stats: {
      async site() {
        const response = await transport.get<SiteStatsResponse>(STATS_ENDPOINT);
        return parseSiteStatsResponse(response);
      },
      async page(path) {
        const normalizedPath = normalizePath(path);
        const response = await transport.get<PageStatsResponse>(
          STATS_ENDPOINT,
          {
            path: normalizedPath,
          },
        );
        return parsePageStatsResponse(response, normalizedPath);
      },
    },
    destroy() {
      destroyed = true;
      if (isBrowser()) {
        removeUnloadListeners();
      }
    },
  };
}
