/**
 * LiteTrack SDK
 *
 * 专注于"发数据"这一件事：上报页面访问、阅读深度、身份标识，以及查询统计数据。
 * 路由监听、滚动监听等框架相关逻辑由调用方自行实现。
 *
 * 版本契约：SDK 大版本号决定请求的 API 前缀（1.x → /litetrack/v1）。
 *
 * @example
 * // CDN 引入（IIFE）
 * // <script src="https://your-host/sdk/1.0.0/litetrack.min.js"></script>
 * // const tracker = LiteTrack.create({ siteToken: 'st_xxx', baseUrl: '...' })
 *
 * @example
 * // npm 安装（ESM）
 * // import { create } from 'litetrack-sdk'
 * // const tracker = create({ siteToken: 'st_xxx', baseUrl: '...' })
 */

export { create } from './core/client';
export { SDK_VERSION as version } from './core/version';

export type {
  LiteTrackCreateOptions,
  LiteTrackError,
  LiteTrackErrorCode,
  LiteTrackIdentity,
  PageInput,
  PageStats,
  ReadInput,
  SiteStats,
  Tracker,
  TrackerStats,
} from './core/types';
