/**
 * LiteTrack SDK
 *
 * 推荐用法：
 * const tracker = LiteTrack.create({
 *   siteToken: 'st_xxx',
 *   baseUrl: 'https://your-api.com', // 仅服务器源，SDK 按自身版本自动拼接 /litetrack/v{major}
 * })
 *
 * 版本契约：SDK 大版本决定请求的 API 前缀（1.x → /litetrack/v1）。
 */

export { create } from './core/client';
export { SDK_VERSION as version } from './core/version';

export type {
  LiteTrackCreateOptions,
  LiteTrackError,
  LiteTrackErrorCode,
  LiteTrackIdentity,
  NavigateInput,
  PageInput,
  PageStats,
  ReadInput,
  SiteStats,
  Tracker,
  TrackerStats,
} from './core/types';
