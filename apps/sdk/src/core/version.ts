/**
 * SDK 版本与 API 契约版本
 *
 * 两个版本号刻意解耦，语义不同：
 *   - SDK_VERSION：npm 语义化版本，面向接入 SDK 的开发者。可自由迭代，
 *     改了 JS 公共 API（删配置项、改方法名等）就升 major，与后端无关。
 *   - API_VERSION：与后端约定的 HTTP wire 协议契约版本。只有在上报协议
 *     发生【破坏性变更】（删/改必填字段、改语义、改鉴权）时才手动改，
 *     而且极其罕见——上报 schema 应坚持「只增不改」以让 v1 尽量永不升级。
 *
 * ⚠️ 千万不要把 API_VERSION 从 SDK 大版本号推导，否则 SDK 一升 major
 * 就会打到后端不存在的 /v2 → 埋点静默失效。
 *
 * `__SDK_VERSION__` 由 tsdown 在构建时通过 define 注入（见 tsdown.config.ts），
 * 值来自 package.json。非构建环境（如 vitest 单测）不会被替换，
 * 此处用 typeof 守卫安全回退，避免 ReferenceError。
 */
declare const __SDK_VERSION__: string | undefined;

export const SDK_VERSION: string =
  typeof __SDK_VERSION__ !== 'undefined' ? __SDK_VERSION__ : '1.0.0-dev';

/** API 路径基址，与后端 server.ts 的公共契约前缀对齐 */
const API_PATH_BASE = '/litetrack';

/**
 * API 契约版本（独立于 SDK 语义化版本）。
 * 仅在后端上报协议发生破坏性变更、迁移到新版本时才修改此处。
 * publish 脚本会读取此常量写入 manifest 的 apiVersion 字段。
 */
export const API_VERSION = 'v1' as const;

/** 完整 API 前缀，如 `/litetrack/v1` */
export const API_PREFIX = `${API_PATH_BASE}/${API_VERSION}`;
