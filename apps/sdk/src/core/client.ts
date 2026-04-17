import {
  DEFAULT_READ_PROGRESS_MILESTONES,
  READ_PROGRESS_ENDPOINT,
  STATS_ENDPOINT,
  TRACK_ENDPOINT,
} from './constants';
import {
  getCurrentPath,
  getPageTitle,
  getReadPercent,
  isBrowser,
  isDocumentHidden,
  normalizeBaseUrl,
  normalizeMilestones,
  normalizePath,
} from './env';
import { createLiteTrackError } from './errors';
import { createIdentityStore } from './identity';
import { createTransport } from './transport';
import type {
  LiteTrackCreateOptions,
  NavigateInput,
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
    totalViews: typeof response.totalViews === 'number' ? response.totalViews : 0,
    totalPages: typeof response.totalPages === 'number' ? response.totalPages : 0,
  };
}

function parsePageStatsResponse(response: PageStatsResponse, path: string): PageStats {
  return {
    path: typeof response.path === 'string' ? normalizePath(response.path) : path,
    count: typeof response.count === 'number' ? response.count : 0,
  };
}

export function create(options: LiteTrackCreateOptions): Tracker {
  const validated = assertCreateOptions(options);
  const transport = createTransport({
    baseUrl: validated.baseUrl,
    siteToken: validated.siteToken,
    debug: options.debug,
    onError: options.onError,
  });
  const identityStore = createIdentityStore(options.identity);
  const milestones = normalizeMilestones(
    options.readProgressMilestones ?? DEFAULT_READ_PROGRESS_MILESTONES,
  );

  let destroyed = false;
  let currentPath = getCurrentPath();
  let sentMaxPercent = 0;
  let sentMilestones = new Set<number>();

  const resetReadProgressState = (): void => {
    sentMaxPercent = 0;
    sentMilestones = new Set<number>();
  };

  const sendPageview = (input?: PageInput): void => {
    const path = normalizePath(input?.path ?? currentPath);
    currentPath = path;

    transport.post(TRACK_ENDPOINT, {
      path,
      title: getPageTitle(input?.title),
      visitorId: identityStore.get().visitorId,
      sessionId: identityStore.get().sessionId,
    });
  };

  const sendReadProgress = (input: ReadInput): void => {
    const path = normalizePath(input.path ?? currentPath);
    currentPath = path;

    const nextPercent = Math.max(0, Math.min(100, Math.round(input.percent)));
    if (nextPercent <= sentMaxPercent) {
      return;
    }

    sentMaxPercent = nextPercent;

    const identity = identityStore.get();
    transport.post(READ_PROGRESS_ENDPOINT, {
      path,
      maxDepth: nextPercent,
      visitorId: identity.visitorId,
      sessionId: identity.sessionId,
    });
  };

  const handleScroll = (): void => {
    if (destroyed) {
      return;
    }

    const currentPercent = getReadPercent();

    milestones.forEach((milestone) => {
      if (currentPercent >= milestone && !sentMilestones.has(milestone)) {
        sentMilestones.add(milestone);
        sendReadProgress({ percent: milestone, path: currentPath });
      }
    });
  };

  const handlePageHide = (): void => {
    if (destroyed) {
      return;
    }

    sendReadProgress({
      percent: getReadPercent(),
      path: currentPath,
    });
  };

  const handleVisibilityChange = (): void => {
    if (!isDocumentHidden()) {
      return;
    }

    handlePageHide();
  };

  if (options.autoPageview !== false) {
    sendPageview();
  }

  if (options.autoReadProgress && isBrowser()) {
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    handleScroll();
  }

  return {
    page(input) {
      if (destroyed) {
        return;
      }

      sendPageview(input);
    },
    read(input) {
      if (destroyed) {
        return;
      }

      if (typeof input === 'number') {
        sendReadProgress({ percent: input, path: currentPath });
        return;
      }

      sendReadProgress(input);
    },
    navigate(input: NavigateInput) {
      if (destroyed) {
        return;
      }

      currentPath = normalizePath(input.path);

      if (input.resetReadProgress !== false) {
        resetReadProgressState();
      }

      if (input.trackPageview !== false) {
        sendPageview({
          path: currentPath,
          title: input.title,
        });
      }
    },
    identify(identity) {
      if (destroyed) {
        return;
      }

      identityStore.set(identity);
    },
    stats: {
      async site() {
        const response = await transport.get<SiteStatsResponse>(STATS_ENDPOINT);
        return parseSiteStatsResponse(response);
      },
      async page(path) {
        const normalizedPath = normalizePath(path);
        const response = await transport.get<PageStatsResponse>(STATS_ENDPOINT, {
          path: normalizedPath,
        });
        return parsePageStatsResponse(response, normalizedPath);
      },
    },
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;

      if (options.autoReadProgress && isBrowser()) {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('pagehide', handlePageHide);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    },
  };
}
