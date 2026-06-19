/**
 * SDK 错误码，标识不同的失败类型：
 * - `INVALID_OPTIONS` — 初始化参数不合法（如 siteToken 为空）
 * - `ENVIRONMENT_ERROR` — 当前环境缺少必要 API（如不支持 fetch）
 * - `NETWORK_ERROR` — 网络请求失败（断网、超时、CORS 等）
 * - `HTTP_ERROR` — 服务端返回非 2xx 状态码
 * - `INVALID_RESPONSE` — 响应体不是合法 JSON
 */
export type LiteTrackErrorCode =
  | 'INVALID_OPTIONS'
  | 'ENVIRONMENT_ERROR'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE';

/**
 * SDK 抛出的结构化错误。
 *
 * - `page()`、`read()` 等 fire-and-forget 方法：错误通过 `onError` 静默传出，不抛出异常
 * - `stats.site()`、`stats.page()` 等读取接口：同时触发 `onError` 并 reject Promise
 */
export interface LiteTrackError extends Error {
  /** 错误类型，用于区分不同失败场景 */
  code: LiteTrackErrorCode;
  /** HTTP 状态码，仅 `HTTP_ERROR` 时存在 */
  status?: number;
  /** 原始错误对象（如 fetch 抛出的异常） */
  cause?: unknown;
  /** 额外调试信息，如请求 URL、端点路径 */
  context?: Record<string, unknown>;
}

/** @internal */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * 访客与会话身份标识。
 *
 * 不传时 SDK 自动生成并持久化：
 * - `visitorId`：写入 localStorage，跨会话保持
 * - `sessionId`：写入 sessionStorage，标签页关闭后重置
 *
 * 存储不可用（隐私模式等）时自动降级到内存。
 */
export interface LiteTrackIdentity {
  /**
   * 访客唯一 ID，跨会话持久化到 `localStorage`。
   * 前缀为 `ltv_`（如 `ltv_550e8400-...`）。
   */
  visitorId?: string;
  /**
   * 会话 ID，生命周期同浏览器标签页，持久化到 `sessionStorage`。
   * 前缀为 `lts_`（如 `lts_550e8400-...`）。
   */
  sessionId?: string;
}

/** `LiteTrack.create()` 初始化选项 */
export interface LiteTrackCreateOptions {
  /**
   * 站点令牌，从 LiteTrack 管理界面复制（必填）。
   * @example 'st_abc123'
   */
  siteToken: string;
  /**
   * 后端 API 地址，填写服务器源即可，SDK 自动拼接版本前缀。
   * @example 'https://your-api.example.com'
   */
  baseUrl: string;
  /**
   * 预设身份标识，不填则由 SDK 自动生成。
   * 适合已有用户体系时，将自己的用户 ID 传给 `visitorId`。
   */
  identity?: LiteTrackIdentity;
  /**
   * 开启调试模式，错误信息会同时输出到 `console.error`。
   * @default false
   */
  debug?: boolean;
  /**
   * 错误回调。`page()`、`read()` 等 fire-and-forget 方法的错误通过此回调传出。
   * @example
   * onError: (err) => console.warn('[tracker]', err.code, err.message)
   */
  onError?: (error: LiteTrackError) => void;
}

/** `tracker.page()` 参数，全部可选 */
export interface PageInput {
  /**
   * 页面路径。
   * @default window.location.pathname
   */
  path?: string;
  /**
   * 页面标题。
   * @default document.title
   */
  title?: string;
}

/** `tracker.read()` 的对象参数形式 */
export interface ReadInput {
  /**
   * 页面路径。
   * @default window.location.pathname
   */
  path?: string;
  /**
   * 阅读深度百分比（0–100），超出范围会自动 clamp。
   * @example 75
   */
  percent: number;
}

/** 站点整体统计数据 */
export interface SiteStats {
  /** 总 PV 数 */
  totalViews: number;
  /** 独立页面数 */
  totalPages: number;
}

/** 单个页面的统计数据 */
export interface PageStats {
  /** 规范化后的页面路径 */
  path: string;
  /** 该页面的 PV 数 */
  count: number;
}

/** 统计查询接口（读操作，返回 Promise） */
export interface TrackerStats {
  /** 查询站点整体统计数据 */
  site(): Promise<SiteStats>;
  /**
   * 查询指定页面的统计数据。
   * @param path 页面路径，自动规范化（补前缀 `/`、去尾斜杠）
   */
  page(path: string): Promise<PageStats>;
}

/**
 * Tracker 实例，由 `LiteTrack.create()` 返回。
 *
 * @example
 * const tracker = LiteTrack.create({ siteToken: 'st_xxx', baseUrl: 'https://api.example.com' })
 * tracker.page()      // 上报当前页面访问
 * tracker.read(75)    // 上报阅读到 75%
 */
export interface Tracker {
  /**
   * 上报一次页面访问（PV）。
   *
   * 不传参数时实时读取 `window.location.pathname` 和 `document.title`，
   * 适合直接在 SPA 路由钩子（如 `router.afterEach`）里调用，无需手动传路径。
   *
   * @example
   * tracker.page()                            // 自动读取当前路径和标题
   * tracker.page({ path: '/about' })          // 指定路径
   * tracker.page({ path: '/post', title: '...' })
   */
  page(input?: PageInput): void;

  /**
   * 上报阅读深度。
   *
   * 简写形式直接传百分比数字；完整形式传对象可同时指定路径。
   * 路径不传时实时读取 `window.location.pathname`。
   *
   * @param input 阅读百分比（0–100）或包含 `path` 的对象
   *
   * @example
   * tracker.read(75)                          // 简写：上报 75% 阅读深度
   * tracker.read({ path: '/post', percent: 75 })
   */
  read(input: number | ReadInput): void;

  /**
   * 更新访客或会话身份标识。调用后，后续所有上报都会携带新的身份。
   *
   * 只需传需要更新的字段，未传的字段保持不变。
   *
   * @example
   * // 用户登录后绑定自己的 ID
   * tracker.identify({ visitorId: 'user_123' })
   */
  identify(identity: LiteTrackIdentity): void;

  /** 查询统计数据 */
  stats: TrackerStats;

  /**
   * 销毁追踪器，后续所有调用将被静默忽略。
   *
   * 适合在 SPA 组件卸载或页面销毁时调用，防止意外上报。
   *
   * @example
   * onUnmounted(() => tracker.destroy())
   */
  destroy(): void;
}
