/**
 * SDK 版本与 API 前缀推导
 *
 * 版本契约：SDK 大版本号决定它请求的后端 API 版本前缀。
 *   - SDK 1.x → /litetrack/v1
 *   - SDK 2.x → /litetrack/v2
 *
 * `__SDK_VERSION__` 由 tsdown 在构建时通过 define 注入（见 tsdown.config.ts），
 * 值来自 package.json。非构建环境（如 vitest 单测）不会被替换，
 * 此处用 typeof 守卫安全回退，避免 ReferenceError。
 */
declare const __SDK_VERSION__: string | undefined;

export const SDK_VERSION: string =
  typeof __SDK_VERSION__ !== 'undefined' ? __SDK_VERSION__ : '1.0.0-dev';

/** API 路径基址，与后端 server.ts 的 routePrefix 对齐 */
const API_PATH_BASE = '/litetrack';

/** SDK 大版本号，决定请求哪个 API 版本（缺省回退到 1） */
export const API_MAJOR: string = SDK_VERSION.split('.')[0] || '1';

/** 完整 API 前缀，如 `/litetrack/v1` */
export const API_PREFIX = `${API_PATH_BASE}/v${API_MAJOR}`;
