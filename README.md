# LiteTrack

轻量级网站访问统计 Monorepo，包含后端 API、管理后台和浏览器端 SDK。

## 当前能力

- 页面访问统计（PV）
- 近 7 / 30 / 90 / 365 天趋势图
- 访客 UV 统计
- 设备 / 浏览器 / 操作系统分布
- 阅读深度与完成率分析
- 访问日志查询
- 多站点与 Site Token 管理
- GitHub OAuth 登录

适合个人站、博客、文档站等希望自托管统计数据的场景。

## 仓库结构

```text
apps/
├── server/  # Fastify + Prisma + Redis 后端
├── admin/   # Vue 3 管理后台
└── sdk/     # 浏览器端埋点 SDK
```

各模块文档：

- [后端文档](./apps/server/README.md)
- [前端文档](./apps/admin/README.md)
- [SDK 文档](./apps/sdk/README.md)

## 快速开始

```bash
pnpm install
```

然后分别按模块文档准备环境变量并启动：

- `apps/server`：API 服务，默认 `http://localhost:3000`
- `apps/admin`：管理后台，默认 `http://localhost:8080`
- `apps/sdk`：浏览器端 SDK 构建产物

## 在线使用

- 产品地址：<https://litetrack.xiaowo.live>

## 许可证

MIT
