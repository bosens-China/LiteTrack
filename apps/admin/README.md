# LiteTrack Admin

LiteTrack 管理后台，基于 Vue 3、Pinia、Vue Router、Naive UI、ECharts。

## 当前功能

- GitHub OAuth 登录
- 仪表盘聚合概览
- 站点列表与站点详情
- 热门页面、趋势图、页面检索
- UV / 设备 / 阅读分析
- 访问日志查询
- Site Token 管理

## 快速开始

```bash
pnpm install

cd apps/admin
cp .env.example .env
pnpm dev
```

默认地址：`http://localhost:8080`

## 环境变量

```env
PUBLIC_API_BASE_URL=http://localhost:3000/litetrack/v1
```

## OAuth 对接要求

- GitHub OAuth 回调地址：`http://localhost:8080/auth/callback`
- 该地址必须与：
  - `apps/server/.env` 中的 `GITHUB_CALLBACK_URL`
  - GitHub OAuth App 的 `Authorization callback URL`
  保持一致
- 登录页会生成随机 `state`，并在回调页完成校验

## 页面路由

| 路由 | 页面 | 说明 |
| ---- | ---- | ---- |
| `/login` | 登录页 | 发起 GitHub OAuth 登录 |
| `/auth/callback` | 登录回调 | 校验 `state` 并完成登录 |
| `/` | 仪表盘 | 聚合展示站点数、今日 PV、总 PV |
| `/sites` | 网站列表 | 管理全部站点 |
| `/sites/:id` | 网站详情 | 查看统计、访问日志、管理 Token |

## 目录结构

```text
src/
├── api/                        # 后端接口封装
├── composables/site-detail/    # 站点详情页面逻辑拆分
├── components/                 # 公共组件
├── router/                     # Vue Router 配置
├── stores/                     # Pinia 状态
├── views/                      # 页面与页面级组件
│   └── SiteDetail/
│       ├── modals/             # 详情页弹窗组件
│       └── *.vue
└── App.vue
```

## 开发命令

```bash
cd apps/admin

pnpm dev
pnpm build
pnpm type-check
pnpm lint
```

## 与后端协作约定

- 管理后台登录态基于后端签发的 JWT
- 仪表盘使用 `/stats/dashboard` 聚合接口，避免按站点逐个拉取统计
- 访问日志直接消费后端返回的 `deviceType` / `browser` / `os` 字段，不在前端重复解析 User-Agent
