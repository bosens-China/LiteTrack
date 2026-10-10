# @boses/litetrack-sdk

## [2.0.0](https://github.com/bosens-China/LiteTrack/compare/v1.1.1...v2.0.0) (2026-10-10)


### ⚠ BREAKING CHANGES

* **sdk:** replace the previous SDK API and collection protocol; require the new Hono server, React admin, and a fresh database. Old SDKs and stored data are not compatible. Release-please must advance the SDK from 1.1.1 to 2.0.0.

### Features

* **sdk:** 重构统计协议、服务端和管理后台 ([aa56d9a](https://github.com/bosens-China/LiteTrack/commit/aa56d9ab2d2d515897ef714842817cdd74a535fd))


### Bug Fixes

* **sdk:** 声明发布测试所需的 Node.js 类型依赖 ([5bec41e](https://github.com/bosens-China/LiteTrack/commit/5bec41e35fe253a211d8b2d049da02ea475a08a7))

## 1.1.1

### Patch Changes

- c93f94a: 修复两处可靠性问题：
  - 存储可用性探测后清理 `__litetrack_probe__` 探针键，不再在用户 localStorage/sessionStorage 残留垃圾键。
  - 停留时长上报叠加 `pagehide` 与 `visibilitychange(hidden)` 兜底，修复移动端 Safari / bfcache 下 `beforeunload` 不触发导致的时长丢失；切回前台时重置计时起点，避免二次停留被漏报。
