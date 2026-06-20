# Routes Folder

这里放 LiteTrack 的顶层业务路由，由 `server.ts` 通过 autoload **按受众分两组**加载，挂载到不同前缀下。健康检查 `/health` 直接在 `server.ts` 注册，不在此目录。

## 当前路由划分

- `public/`（→ `/litetrack/v1`，**公共契约 · 带版本**）
  - `track/` 面向 SDK 的公开上报与校验、公开统计查询接口。契约稳定，只增不改，破坏性变更才迁移到 `v2`。
- `internal/`（→ `/litetrack/api`，**内部接口 · 不带版本**）
  - `auth/` GitHub OAuth 登录、回调、当前用户信息。
  - `sites/` 站点与 Site Token 管理。
  - `stats/` 后台统计查询入口，内部继续拆到 `src/modules/stats/*`。

## 约定

- **新增接口先判断受众**：给 SDK 用 → `public/`（受契约约束）；给后台前端用 → `internal/`（可自由演进）。
- 升级到 `v2` 时新增 `public/v2/` 同级目录并保留 `public/`（即 v1），不要原地破坏。
- 如果某个领域继续增长，优先拆目录并保留 `index.ts` 作为装配入口。
- 共享能力通过 `plugins/` 提供，不要在路由之间直接耦合实现细节。
