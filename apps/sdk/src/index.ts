/**
 * LiteTrack SDK
 *
 * 推荐用法：
 * const tracker = LiteTrack.create({
 *   siteToken: 'st_xxx',
 *   baseUrl: 'https://your-api.com/litetrack/v1',
 * })
 */

export { create } from './core/client';

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
