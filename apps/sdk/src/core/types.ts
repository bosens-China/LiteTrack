export type LiteTrackErrorCode =
  | 'INVALID_OPTIONS'
  | 'ENVIRONMENT_ERROR'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

export interface LiteTrackError extends Error {
  code: LiteTrackErrorCode;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LiteTrackIdentity {
  visitorId?: string;
  sessionId?: string;
}

export interface LiteTrackCreateOptions {
  siteToken: string;
  baseUrl: string;
  autoPageview?: boolean;
  autoReadProgress?: boolean;
  readProgressMilestones?: number[];
  identity?: LiteTrackIdentity;
  debug?: boolean;
  onError?: (error: LiteTrackError) => void;
}

export interface PageInput {
  path?: string;
  title?: string;
}

export interface ReadInput {
  path?: string;
  percent: number;
}

export interface NavigateInput {
  path: string;
  title?: string;
  trackPageview?: boolean;
  resetReadProgress?: boolean;
}

export interface SiteStats {
  totalViews: number;
  totalPages: number;
}

export interface PageStats {
  path: string;
  count: number;
}

export interface TrackerStats {
  site(): Promise<SiteStats>;
  page(path: string): Promise<PageStats>;
}

export interface Tracker {
  page(input?: PageInput): void;
  read(input: number | ReadInput): void;
  navigate(input: NavigateInput): void;
  identify(identity: LiteTrackIdentity): void;
  stats: TrackerStats;
  destroy(): void;
}
