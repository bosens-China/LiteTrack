# LiteTrack Server

LiteTrack 统计分析后端，基于 Fastify、Prisma、PostgreSQL、Redis。

## 主要职责

- GitHub OAuth 登录与 JWT 鉴权
- Site / Site Token 管理
- 页面访问、UV、设备分布、阅读分析查询
- 公开埋点上报与阅读进度上报
- 访问日志记录与查询

## 快速开始

### 1. 安装依赖

在仓库根目录执行：

```bash
pnpm install
```

### 2. 准备 PostgreSQL 与 Redis

请自行准备可用的 PostgreSQL 和 Redis 实例，并把连接串写入 `apps/server/.env`。

### 3. 配置环境变量

在 `apps/server` 目录执行：

```bash
cp .env.example .env
```

然后编辑 `apps/server/.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/litetrack"
REDIS_URL="redis://localhost:6379"

# 生产环境请替换为随机强密码
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# 默认 JWT 有效期，管理后台当前建议 30 天
JWT_EXPIRES_IN="30d"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:8080/auth/callback"

APP_TIMEZONE="Asia/Shanghai"
LOG_LEVEL="info"
```

### 4. 初始化数据库

```bash
cd apps/server
pnpm db:generate
pnpm db:push
```

### 5. 启动开发服务器

```bash
cd apps/server
pnpm dev
```

默认地址：`http://localhost:3000`

## API 概览

所有 API 路由前缀为 `/litetrack/v1`。

### 认证相关

| 方法 | 路由 | 说明 |
| ---- | ---- | ---- |
| GET | `/auth/github?state=...` | GitHub OAuth 登录入口，要求前端传入 `state` |
| GET | `/auth/github/callback?code=...&state=...` | GitHub OAuth 回调，交换 token 并签发 JWT |
| GET | `/auth/me` | 获取当前用户信息 |

### 网站管理

| 方法 | 路由 | 说明 |
| ---- | ---- | ---- |
| GET | `/sites` | 获取当前用户全部站点 |
| POST | `/sites` | 创建站点并生成默认 Site Token |
| GET | `/sites/:id` | 获取站点详情与 Token 列表 |
| PATCH | `/sites/:id` | 更新站点信息 |
| DELETE | `/sites/:id` | 删除站点 |
| POST | `/sites/:id/tokens` | 新建 Site Token |
| PATCH | `/sites/:siteId/tokens/:tokenId` | 更新 Token |
| DELETE | `/sites/:siteId/tokens/:tokenId` | 删除 Token |

### 统计查询

| 方法 | 路由 | 说明 |
| ---- | ---- | ---- |
| GET | `/stats/dashboard` | 当前用户站点聚合概览 |
| GET | `/stats/:siteId` | 站点综合统计 |
| GET | `/stats/:siteId/popular` | 热门页面 Top 10 |
| GET | `/stats/:siteId/trend?days=30` | 访问趋势 |
| GET | `/stats/:siteId/pages?page=1&pageSize=20` | 页面列表，支持搜索 / 排序 / 分页 |
| GET | `/stats/:siteId/visitors?days=30` | UV 概览与趋势 |
| GET | `/stats/:siteId/devices?days=30` | 设备 / 浏览器 / 操作系统分布 |
| GET | `/stats/:siteId/reading?days=30&path=/post` | 阅读深度与完成率 |
| GET | `/stats/:siteId/logs?page=1&pageSize=20` | 访问日志，返回设备字段 |

### 数据上报

| 方法 | 路由 | 说明 |
| ---- | ---- | ---- |
| POST | `/track` | 页面访问上报 |
| POST | `/track/read-progress` | 阅读深度上报 |
| GET | `/track/stats` | 公开查询站点 / 页面 PV |
| GET | `/track/verify` | 校验 Site Token |

`POST /track` 与 `POST /track/read-progress` 都要求请求头携带 `X-Site-Token`。

## OAuth 配置说明

1. 在 GitHub 创建 OAuth App。
2. `Homepage URL` 填 `http://localhost:8080`
3. `Authorization callback URL` 填 `http://localhost:8080/auth/callback`
4. 保持 GitHub 配置、`apps/admin` 路由、`GITHUB_CALLBACK_URL` 三者一致。
5. 前端会生成并校验 `state`，后端要求该字段参与登录流程。

## 项目结构

```text
src/
├── lib/              # 配置、访客解析等共享逻辑
├── modules/stats/    # 统计路由按领域拆分
├── plugins/          # Fastify 插件
├── routes/           # 认证、站点、上报等顶层路由
└── server.ts         # buildServer 工厂
```

## 测试与检查

```bash
cd apps/server

pnpm lint
pnpm check
pnpm test
```

当前已覆盖：

- 基础健康检查
- 统计查询关键场景
- 上报链路关键场景
- `buildServer + autoload + prefix` 真实装配链路

## Docker

```bash
docker build -f apps/server/Dockerfile -t litetrack-server .
```

运行前请准备好外部 PostgreSQL、Redis，并传入必需环境变量。
