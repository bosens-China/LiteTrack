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
TRUST_PROXY="false"
TRACK_IP_RATE_LIMIT="300"
TRACK_SITE_RATE_LIMIT="6000"
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

接口按受众分两类前缀：

- **公共契约（带版本）** `/litetrack/v1`：面向 SDK 的 `track/*` 上报与公开统计查询，契约稳定，破坏性变更才升 v2。
- **内部接口（不带版本）** `/litetrack/api`：面向后台前端的 `auth/* | sites/* | stats/*`，随前端一起部署演进。

此外 `/health`（不带版本）用于容器健康检查。

### 认证相关

| 方法 | 路由                                       | 说明                                        |
| ---- | ------------------------------------------ | ------------------------------------------- |
| GET  | `/auth/github?state=...`                   | GitHub OAuth 登录入口，要求前端传入 `state` |
| GET  | `/auth/github/callback?code=...&state=...` | GitHub OAuth 回调，交换 token 并签发 JWT    |
| GET  | `/auth/me`                                 | 获取当前用户信息                            |

### 网站管理

| 方法   | 路由                             | 说明                          |
| ------ | -------------------------------- | ----------------------------- |
| GET    | `/sites`                         | 获取当前用户全部站点          |
| POST   | `/sites`                         | 创建站点并生成默认 Site Token |
| GET    | `/sites/:id`                     | 获取站点详情与 Token 列表     |
| PATCH  | `/sites/:id`                     | 更新站点信息                  |
| DELETE | `/sites/:id`                     | 删除站点                      |
| POST   | `/sites/:id/tokens`              | 新建 Site Token               |
| PATCH  | `/sites/:siteId/tokens/:tokenId` | 更新 Token                    |
| DELETE | `/sites/:siteId/tokens/:tokenId` | 删除 Token                    |

### 统计查询

| 方法 | 路由                                        | 说明                             |
| ---- | ------------------------------------------- | -------------------------------- |
| GET  | `/stats/dashboard`                          | 当前用户站点聚合概览             |
| GET  | `/stats/:siteId`                            | 站点综合统计                     |
| GET  | `/stats/:siteId/popular`                    | 热门页面 Top 10                  |
| GET  | `/stats/:siteId/trend?days=30`              | 访问趋势                         |
| GET  | `/stats/:siteId/pages?page=1&pageSize=20`   | 页面列表，支持搜索 / 排序 / 分页 |
| GET  | `/stats/:siteId/visitors?days=30`           | UV 概览与趋势                    |
| GET  | `/stats/:siteId/devices?days=30`            | 设备 / 浏览器 / 操作系统分布     |
| GET  | `/stats/:siteId/reading?days=30&path=/post` | 阅读深度与完成率                 |
| GET  | `/stats/:siteId/logs?page=1&pageSize=20`    | 访问日志，返回设备字段           |

### 数据上报

| 方法 | 路由                   | 说明                   |
| ---- | ---------------------- | ---------------------- |
| POST | `/track`               | 页面访问上报           |
| POST | `/track/read-progress` | 阅读深度上报           |
| POST | `/track/duration`      | 页面停留时长上报       |
| GET  | `/track/stats`         | 公开查询站点 / 页面 PV |
| GET  | `/track/verify`        | 校验 Site Token        |

上述上报接口都要求请求头携带 `X-Site-Token`，实际地址加上 `/litetrack/v1` 前缀。未知请求字段会被忽略。

### 采集语义与限流

- 整个公开 track 路由在解析请求体、查询数据库之前，按客户端 IP 限制每分钟 300 次请求（OPTIONS 除外）；写入接口还按站点限制每分钟 6000 次。分别通过 `TRACK_IP_RATE_LIMIT`、`TRACK_SITE_RATE_LIMIT` 调整。阅读和时长另保留每 IP / 站点每分钟 120、30 次限制。
- PV 使用站点、归档日期、路径、visitorId 和 sessionId 做 10 秒原子去重；无 visitorId 的旧客户端回退到 IP。共享出口 IP 的不同访客分别计数。
- 一次 PV 的总量、每日量、UV 和访问日志在同一事务中提交。已提交的重复请求返回 `{ success: true, cached: true }`；仍在处理的重复请求返回 503 和 `Retry-After: 1`。写入失败回滚，并释放本次预留以允许重试。
- 阅读深度通过数据库原子更新保留最大值；时长写入完成后才返回成功。写入失败返回 500，限流返回 429。
- 去重是短窗口抑制机制，不是持久化事件幂等协议。进程崩溃、Redis 数据丢失或超出去重窗口的重试仍可能重复计数；SDK 当前不提供可靠重试队列。

## OAuth 配置说明

1. 在 GitHub 创建 OAuth App。
2. `Homepage URL` 填 `http://localhost:8080`
3. `Authorization callback URL` 填 `http://localhost:8080/auth/callback`
4. 保持 GitHub 配置、`apps/admin` 路由、`GITHUB_CALLBACK_URL` 三者一致。
5. 前端会生成并校验 `state`，后端使用 Redis `GETDEL` 原子核销（需要 Redis 6.2+，部署使用 Redis 7）。
6. 上游请求各有 10 秒超时。后端请求日志与默认 Nginx 访问日志都去除 URL 查询参数，OAuth 错误只记录错误码和上游状态，不记录授权码、客户端密钥和 access token。

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

默认测试使用假配置和 mock，不连接开发数据库；真实集成测试在缺少 `TEST_DATABASE_URL` / `TEST_REDIS_URL` 时跳过。用专用测试库执行全部回归：

```bash
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/litetrack_test"
export TEST_REDIS_URL="redis://localhost:6379/1"
DATABASE_URL="$TEST_DATABASE_URL" pnpm db:generate
DATABASE_URL="$TEST_DATABASE_URL" pnpm exec prisma migrate deploy
pnpm test
```

先配置这两个测试连接变量再执行生成和迁移；不要指向生产库。测试只清理自身创建的站点、用户和 Redis 键，不清空数据库。覆盖真实并发去重、事务回滚、阅读深度竞争、限流、OAuth 日志脱敏、state 重放、JWT 与代理信任边界，以及现有统计查询和路由装配。

### 依赖审计

Fastify、JWT、Axios 和 Prisma 已更新，移除未使用的 `fastify-cli`。工作区对 `fast-uri@3` 和 `prisma>mysql2` 使用安全补丁覆盖；上游依赖修正后可移除。

2026-09-08 的生产依赖审计中，server 依赖路径仍有一项 high 公告：[deepmerge-ts 循环对象递归导致拒绝服务](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)。Prisma 7.10 的配置模块固定依赖 7.1.5；本项目仅合并本地可信 Prisma 配置，HTTP 输入不进入该调用链。保留此项可见，不跨主版本强行覆盖；后续随 Prisma 修复更新。

同日核查 npm：Prisma 最新正式版本仍为 7.10.0，`latest` 标签指向 8.0.0-rc.13。升级时检查实际版本与发布状态，避免将候选版作为常规生产补丁；`deepmerge-ts` 的公告修复版本为 8.0.0。

## Docker

```bash
docker build -f apps/server/Dockerfile -t litetrack-server .
```

运行前请准备好外部 PostgreSQL、Redis，并传入必需环境变量。

### 代理与客户端 IP

- 直连后端保持 `TRUST_PROXY=false`；反代部署填写实际可信代理 IP / CIDR。Fastify 5.12 不再支持 `TRUST_PROXY=1` 等数字跳数配置，应用会在启动时拒绝。
- 仓库 Compose 默认 `uniquelocal`，依赖后端只在受控私网暴露、Nginx 是唯一公网入口。自行增加公开端口或共享网络时，应收紧到实际代理地址；避免在可直连环境中使用 `true`。
- 默认 Nginx 覆盖 `X-Forwarded-For`，并剥离客户端传入的 `CF-IPCountry` / `X-Geo-*`，后端使用离线 IP 定位。外层还有 CDN / 负载均衡时，先在 Nginx 配置明确可信来源的 real-IP 规则，再转发还原后的客户端地址；否则限流会把外层代理视为同一个客户端。
- 自定义代理若要注入地理头，必须先删除客户端同名头，仅允许可信代理生成。Origin 检查只能约束浏览器来源，非浏览器客户端可以伪造，公开 Site Token 不能作为防刷凭证。

相关官方依据：[代理信任](https://fastify.dev/docs/v5.12.x/Reference/Server/#trustproxy)、[请求生命周期](https://fastify.dev/docs/v5.12.x/Reference/Hooks/)、[日志序列化与脱敏](https://fastify.dev/docs/v5.7.x/Reference/Logging/)、[inject 测试](https://fastify.dev/docs/v5.7.x/Guides/Testing/)。完整配置见 [.env.example](./.env.example)。
