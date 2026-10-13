# LiteTrack

面向个人项目的自托管网站统计系统，支持 npm、本地 JS + 类型文件、普通 Script 接入，不强制依赖 npm 包。

- PV、区间 UV、Visits
- PV/UV 趋势、热门页面 PV/UV、来源域名 Visits
- GitHub 登录、多项目和可再次复制的 API Key 管理
- React + Ant Design + React Compiler 后台
- Hono + PostgreSQL + Prisma 后端，Redis 仅用于限流和 OAuth
- TypeScript + tsdown SDK，ESM 类型声明与 IIFE 共用核心

本次为破坏性重构：不导入旧数据，不兼容旧 SDK、旧接口。旧 npm/CDN 发布物不会被覆盖，但它们不能接入新版服务。

## 开发

使用 Node.js 24、pnpm 10.32.0。根目录的 `.nvmrc` 和 `packageManager` 为版本入口。

```bash
pnpm install --frozen-lockfile
docker compose -p litetrack-core up -d --wait
cp apps/server/.env.example apps/server/.env
pnpm --filter server db:migrate
pnpm dev
```

已有 `apps/server/.env` 时手动更新配置，不要直接覆盖。开发数据库为 `litetrack_core`，端口 25434，使用新的 `postgres_core_data` 卷；不会复用旧库或旧卷。Redis 端口 26381。

后台：[http://localhost:8080](http://localhost:8080)。API 端口 3000。配置 GitHub OAuth App 的回调地址：

```text
http://localhost:8080/litetrack/api/auth/github/callback
```

`create()` 不自动采集。创建项目和 API Key 后，在接入项目中显式调用 `page()`。后台可复制或下载独立 index.mjs 与 index.d.mts，也保留 npm 和 Script 示例。开发文件位于 `/sdk/preview/`，不对应已发布的 npm 版本。

## 检查

各 workspace 的 `lint` 使用根 `.oxlintrc.json` 中的 [Oxlint 规则](https://oxc.rs/docs/guide/usage/linter/config.md)；格式化使用 Prettier，类型检查独立执行。

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm build
pnpm --filter @boses/litetrack-sdk check-package
pnpm audit --prod
```

未设置 `TEST_DATABASE_URL` 时，`pnpm test` 只跑单元测试，真实数据库测试会跳过。完整集成测试：

```bash
docker compose -p litetrack-refactor-test -f docker-compose.test.yml up -d --wait
DATABASE_URL=postgresql://litetrack:test_password@127.0.0.1:25433/litetrack_test pnpm --filter server db:migrate
TEST_DATABASE_URL=postgresql://litetrack:test_password@127.0.0.1:25433/litetrack_test TEST_REDIS_URL=redis://127.0.0.1:26380/15 pnpm test
```

浏览器验收与样本性能验证见 [Server 说明](./apps/server/README.md)。

## 结构

```text
apps/
├── admin/           # React 后台
├── server/          # Hono 服务、Prisma 基线与测试
└── sdk/             # 唯一发布到 npm 的包
    └── contracts/   # 私有共享契约、路径规范与协议号
```

契约包归入 SDK 的发布路径，使共享协议改动也能被 release-please 识别；服务端和后台仍通过 workspace 包引用，不直接引用 SDK 实现。

## 部署

```bash
cp .env.example .env
# 填写强随机密码、JWT_SECRET、PUBLIC_URL 与 GitHub OAuth 信息
docker compose -p litetrack-core -f docker-compose.prod.yml up -d --build --wait
```

公网必须配置 HTTPS；生产登录 Cookie 使用 Secure。CI 镜像部署时同时设置 `SERVER_IMAGE` 和 `ADMIN_IMAGE` 为同一个 Git SHA 标签，并使用 `--no-build`。升级 SDK 的接入项目也需要重新部署。

正式发版由 release-please 维护版本，CI 发布 npm 并构建镜像，维护者随后更新生产服务器并验收 CDN。流程和 npm OIDC 配置见 [发布说明](./docs/release.md)。

## 文档

- [产品与文档索引](./docs/index.md)
- [SDK 接入](./apps/sdk/README.md)
- [后端与运维](./apps/server/README.md)
- [后台开发](./apps/admin/README.md)

MIT
