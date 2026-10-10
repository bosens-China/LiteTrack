# LiteTrack Server

Hono + Node.js 24，PostgreSQL 16 + Prisma 7，Redis 7。仅维护新版 `POST /litetrack/collect` 与鉴权后台接口 `/litetrack/api`。

## 本地运行

先按 [根 README](../../README.md) 启动独立数据库并准备 `.env`，再执行：

```bash
pnpm --filter @litetrack/contracts build
pnpm --filter server db:generate
pnpm --filter server db:migrate
pnpm --filter server dev
```

`db:migrate` 使用 `prisma migrate deploy`。新基线只能应用于新库，禁止对旧线上库执行 reset、db push 或直接替换迁移历史。未来升级继续追加迁移，不能再次把不保留历史当作常规策略。

## 配置

权威模板为 [.env.example](./.env.example)。

| 变量                                    | 说明                                                      |
| --------------------------------------- | --------------------------------------------------------- |
| DATABASE_URL                            | PostgreSQL URL，必填                                      |
| REDIS_URL                               | Redis URL；开发使用 26381                                 |
| JWT_SECRET                              | 至少 32 字符的随机值，必填                                |
| PUBLIC_URL                              | 后台对外根地址，不含子路径、查询或片段                    |
| GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET | GitHub OAuth App；未配置时登录入口返回 503                |
| HOST / PORT                             | 默认 0.0.0.0 / 3000，开发模板绑定回环                     |
| TRUST_PROXY                             | 直连为空；代理模式为明确 IP/CIDR 或 proxy-addr 的地址范围 |
| TRACK_IP_RATE_LIMIT                     | 每 IP 每分钟请求上限，默认 300                            |
| TRACK_SITE_RATE_LIMIT                   | 每站点每分钟采集上限，默认 6000                           |

GitHub 回调为 `PUBLIC_URL/litetrack/api/auth/github/callback`。state 绑定 HttpOnly Cookie，Redis 原子核销且五分钟失效；JWT 保存于 HttpOnly、SameSite=Lax Cookie，生产启用 Secure，有效期 30 天。

Compose 后端不暴露公网端口，只信任私网 Nginx。Nginx 覆盖 X-Forwarded-For，而不是拼接客户端转发链。如果外层还存在 CDN/反向代理，需要明确配置可信入口及真实 IP 还原；不能直接信任任意转发头。不要将 server 直接暴露到不可信私网客户端。

## 接口

| 路径                                     | 职责                           |
| ---------------------------------------- | ------------------------------ |
| GET /health                              | 同时检测 PostgreSQL 和 Redis   |
| POST /litetrack/collect                  | 当前协议页面事件；X-Site-Token |
| GET /litetrack/api/auth/github           | 发起 OAuth                     |
| GET /litetrack/api/auth/github/callback  | OAuth 回调                     |
| GET /litetrack/api/auth/me               | 当前用户                       |
| POST /litetrack/api/auth/logout          | 退出                           |
| /litetrack/api/sites                     | 项目列表、创建                 |
| /litetrack/api/sites/:id                 | 查询、更新、删除项目           |
| /litetrack/api/sites/:id/tokens          | API Key 列表（含原值）、创建   |
| /litetrack/api/sites/:id/tokens/:tokenId | 启停、删除 Token               |
| /litetrack/api/sites/:id/overview        | PV、UV、Visits                 |
| /litetrack/api/sites/:id/trend           | 补零的每日趋势                 |
| /litetrack/api/sites/:id/pages           | 热门页面，20 条分页            |
| /litetrack/api/sites/:id/referrers       | 来源 Visits，前 20 项          |

统计查询使用 `start=YYYY-MM-DD&end=YYYY-MM-DD`，包含首尾日，最多 366 天，日期不早于 1970；页面查询另带 `page`。按 Asia/Shanghai 转换为 UTC 左闭右开区间。区间 UV 直接去重，不累加每日 UV。

接口说明：[http://localhost:3000/litetrack/api/docs](http://localhost:3000/litetrack/api/docs)。请求校验、DTO 和 OpenAPI 响应结构共用 [contracts](../sdk/contracts/src/index.ts)；ORM 模型不作为 SDK 类型导出。

项目沿用 Site/SiteToken 模型；API Key 仅为采集凭据，不授予后台权限。列表和创建接口仅允许已登录的项目所有者访问，返回 Cache-Control: no-store，支持遗失后再次取回复制。

## 采集一致性与安全

- 同一站点和 eventId 永久去重，成功返回 `{ success: true, duplicate: boolean }`。
- 事务内锁定同站点访客，创建或续接会话，更新访客和写入事件；任何失败全部回滚。
- 距上次页面事件达到 30 分钟，下一事件开始新会话；跨日不强制拆分。Visits 和来源归属会话开始日。
- 原始事件和会话是事实来源，不维护同步计数表；重复事件不延长会话。
- 请求限制 16 KiB，协议与字段有长度校验；使用参数化 SQL、站点归属校验和原子 IP/站点限流。
- Origin 存在时必须匹配站点 host（含端口）；缺失允许。公开 Token 和 Origin 都不保证非浏览器来源真实。
- 数据库或 Redis 不可用返回 503，不伪造成功。日志只记录路径、状态、耗时和错误类型，不记录请求体、查询参数或秘密。
- 不持久化 IP/UA/完整来源 URL。Nginx 日志仍含 IP，需由部署方设置日志轮转与保留期。

## 测试

```bash
pnpm --filter server check
pnpm --filter server lint
pnpm --filter server test
```

真实集成测试需要独立 `litetrack_test` 数据库和 Redis，启动与迁移命令见根 README。测试覆盖固定 10 PV / 2 UV / 3 Visits、并发、重放、回滚、跨日、区间 UV、归属、OAuth 重放、伪造代理头、Token 和依赖故障。

启动后台/API 后，使用与服务相同的测试配置运行浏览器验收：

```bash
DATABASE_URL=postgresql://litetrack:test_password@127.0.0.1:25433/litetrack_test REDIS_URL=redis://127.0.0.1:26380/14 JWT_SECRET=local-preview-secret-012345678901234567890 PUBLIC_URL=http://localhost:8080 TRUST_PROXY= PORT=3000 pnpm dev
```

另一个终端执行：

```bash
pnpm --filter server exec playwright install chromium
DATABASE_URL=postgresql://litetrack:test_password@127.0.0.1:25433/litetrack_test REDIS_URL=redis://127.0.0.1:26380/14 JWT_SECRET=local-preview-secret-012345678901234567890 PUBLIC_URL=http://localhost:8080 TRUST_PROXY= pnpm --filter server test:browser
```

测试只在独立库中创建临时用户和站点，使用临时登录 Cookie，不需要真实 GitHub 授权；测试后级联清理。截图默认位于 `/tmp/litetrack-browser`，可用 SCREENSHOT_DIR 覆盖。真实 GitHub 登录需另行验证回调配置。

## 容量与备份

运行 `pnpm --filter server exec tsx test/performance.mts`，同样要求独立测试库与完整环境配置。它生成并清理十万条事件，检查统计结果并输出查询耗时、查询计划和存储增长。

本机 Docker PostgreSQL 样本测得十万事件与索引增长约 20.6 MiB；30 天概览、趋势、热门页面约 67/163/134 ms，来源约 4 ms。单日查询使用 siteId/receivedAt 索引，约 3 ms。这不是生产容量承诺或并发压测，硬件、缓存、字段长度和真实分布都会改变结果。

当前不自动清理原始事件；容量持续增长。建立 PostgreSQL 定期备份并演练恢复，监控磁盘和慢查询；只有真实瓶颈出现时才加入可重建聚合。Redis 不保存统计事实，重启会清除限流/OAuth 临时状态。
