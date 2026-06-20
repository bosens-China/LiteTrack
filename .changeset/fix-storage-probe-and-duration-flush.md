---
'@boses/litetrack-sdk': patch
---

修复两处可靠性问题：

- 存储可用性探测后清理 `__litetrack_probe__` 探针键，不再在用户 localStorage/sessionStorage 残留垃圾键。
- 停留时长上报叠加 `pagehide` 与 `visibilitychange(hidden)` 兜底，修复移动端 Safari / bfcache 下 `beforeunload` 不触发导致的时长丢失；切回前台时重置计时起点，避免二次停留被漏报。
