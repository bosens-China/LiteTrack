/**
 * LiteTrack SDK
 * 
 * 轻量级、框架无关的网站访问统计 SDK
 * 
 * @example
 * ```ts
 * import { init, track } from 'litetrack-sdk'
 * 
 * init({ token: 'your-site-token' })
 * 
 * // 手动上报
 * track('/blog/hello-world')
 * 
 * // 或者自动监听路由变化
 * autoTrack()
 * ```
 */

// SDK 配置选项
export interface LiteTrackOptions {
  /** 网站访问令牌 */
  token: string
  /** API 基础地址，默认 https://api.litetrack.io */
  apiUrl?: string
  /** 是否开启调试模式 */
  debug?: boolean
}

// 内部状态
interface LiteTrackState {
  token: string | null
  apiUrl: string
  debug: boolean
  initialized: boolean
}

const state: LiteTrackState = {
  token: null,
  apiUrl: 'https://api.litetrack.io/litetrack/v1',
  debug: false,
  initialized: false,
}

/**
 * 初始化 SDK
 * 
 * @param options - 配置选项
 * @example
 * ```ts
 * init({ token: 'your-token' })
 * ```
 */
export function init(options: LiteTrackOptions): void {
  if (!options.token) {
    throw new Error('[LiteTrack] token is required')
  }

  state.token = options.token
  state.apiUrl = options.apiUrl || state.apiUrl
  state.debug = options.debug || false
  state.initialized = true

  log('SDK initialized')
}

/**
 * 上报页面访问
 * 
 * @param path - 页面路径，如 /blog/hello-world
 * @example
 * ```ts
 * track('/blog/hello-world')
 * track(window.location.pathname)
 * ```
 */
export function track(path: string): void {
  if (!state.initialized) {
    console.warn('[LiteTrack] SDK not initialized, call init() first')
    return
  }

  if (!path) {
    console.warn('[LiteTrack] path is required')
    return
  }

  const url = `${state.apiUrl}/track`
  const data = { path }

  log('Tracking:', path)

  // 使用 fetch 发送数据
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Site-Token': state.token!,
    },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch((err) => {
    console.error('[LiteTrack] Failed to track:', err)
  })
}

/**
 * 自动追踪页面访问
 * 
 * 监听浏览器路由变化（popstate/hashchange）自动上报
 * 
 * @param getPath - 自定义获取路径的函数，默认使用 location.pathname
 * @example
 * ```ts
 * // 默认使用 location.pathname
 * autoTrack()
 * 
 * // 自定义路径（适用于单页应用）
 * autoTrack(() => window.location.hash.slice(1))
 * ```
 */
export function autoTrack(getPath?: () => string): () => void {
  if (!state.initialized) {
    console.warn('[LiteTrack] SDK not initialized, call init() first')
    return () => {}
  }

  const getCurrentPath = getPath || (() => window.location.pathname)

  // 上报当前页面
  track(getCurrentPath())

  // 监听路由变化
  const handleChange = () => {
    track(getCurrentPath())
  }

  // popstate - 浏览器前进/后退
  window.addEventListener('popstate', handleChange)
  // hashchange - hash 路由变化
  window.addEventListener('hashchange', handleChange)

  log('Auto tracking enabled')

  // 返回取消监听的函数
  return () => {
    window.removeEventListener('popstate', handleChange)
    window.removeEventListener('hashchange', handleChange)
    log('Auto tracking disabled')
  }
}

/**
 * 获取当前配置（用于调试）
 */
export function getConfig(): Readonly<Partial<LiteTrackState>> {
  return {
    apiUrl: state.apiUrl,
    debug: state.debug,
    initialized: state.initialized,
    // 不返回 token 以保护隐私
  }
}

// 日志工具
function log(...args: unknown[]): void {
  if (state.debug) {
    console.log('[LiteTrack]', ...args)
  }
}
