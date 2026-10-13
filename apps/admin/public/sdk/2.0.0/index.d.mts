//#region src/core/types.d.ts
type LiteTrackErrorCode =
  | 'INVALID_OPTIONS'
  | 'ENVIRONMENT_ERROR'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'TIMEOUT';
interface LiteTrackError extends Error {
  code: LiteTrackErrorCode;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}
interface LiteTrackCreateOptions {
  siteToken: string;
  baseUrl: string;
  timeoutMs?: number;
  debug?: boolean;
  onError?: (error: LiteTrackError) => void;
}
interface PageInput {
  path?: string;
  title?: string;
  /** 同一路径需要明确记录一次新打开时使用。 */
  newVisit?: boolean;
}
interface Tracker {
  page(input?: PageInput): void;
  destroy(): void;
}
//#endregion
//#region src/core/client.d.ts
declare function create(options: LiteTrackCreateOptions): Tracker;
//#endregion
//#region src/core/version.d.ts
declare const SDK_VERSION: string;
//#endregion
export {
  type LiteTrackCreateOptions,
  type LiteTrackError,
  type LiteTrackErrorCode,
  type PageInput,
  type Tracker,
  create,
  SDK_VERSION as version,
};
//# sourceMappingURL=index.d.mts.map
