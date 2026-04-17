# Routes Folder

这里放 LiteTrack 的顶层业务路由，统一由 `server.ts` 通过 autoload 加载，并挂载到 `/litetrack/v1` 前缀下。

## 当前路由划分

- `root.ts`
  健康检查与基础服务信息。
- `auth/`
  GitHub OAuth 登录、回调、当前用户信息。
- `sites/`
  站点与 Site Token 管理。
- `stats/`
  统计查询入口，内部继续拆到 `src/modules/stats/*`。
- `track/`
  面向 SDK 的公开上报与校验接口。

## 约定

- 顶层路由负责按领域组织接口。
- 如果某个领域继续增长，优先拆目录并保留 `index.ts` 作为装配入口。
- 共享能力通过 `plugins/` 提供，不要在路由之间直接耦合实现细节。
