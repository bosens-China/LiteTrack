export type LiteTrackErrorCode =
  | 'INVALID_OPTIONS'
  | 'ENVIRONMENT_ERROR'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'TIMEOUT';
export interface LiteTrackError extends Error {
  code: LiteTrackErrorCode;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}
export interface LiteTrackCreateOptions {
  siteToken: string;
  baseUrl: string;
  timeoutMs?: number;
  debug?: boolean;
  onError?: (error: LiteTrackError) => void;
}
export interface PageInput {
  path?: string;
  title?: string;
  /** 同一路径需要明确记录一次新打开时使用。 */
  newVisit?: boolean;
}
export interface Tracker {
  page(input?: PageInput): void;
  destroy(): void;
}
