# LiteTrack 产品需求文档（PRD）

> 版本：1.0 · 状态：草稿 · 最后更新：2026-06-19

---

## 1. 产品概述

### 1.1 背景

个人站长、博客作者和文档维护者普遍面临以下困境：

- 主流分析工具（Google Analytics、百度统计）需要把用户行为数据上传至第三方，存在隐私合规风险。
- 重量级方案（Matomo、Plausible 自托管）部署复杂、资源消耗高，对个人开发者不友好。
- 现有轻量方案缺少**阅读深度**统计，无法衡量内容质量。

### 1.2 产品定位

LiteTrack 是一款**面向个人开发者的自托管轻量访问统计系统**，核心价值是：

- **数据自控**：全部数据存储在用户自己的服务器，零第三方上报。
- **接入轻量**：一行 `<script>` 标签即可完成埋点，无需页面改造。
- **阅读分析**：独有的阅读深度（25 / 50 / 75 / 100%）统计，适合内容型站点。
- **多站点管理**：单一后台管理多个域名，多 Token 控制访问粒度。

### 1.3 目标用户

| 用户         | 场景                                     |
| ------------ | ---------------------------------------- |
| 个人博客作者 | 了解文章阅读完成率，优化写作方向         |
| 文档站维护者 | 分析哪些页面被频繁访问、哪些被跳过       |
| 独立开发者   | 对自己产品的落地页、帮助中心进行数据洞察 |

---

## 2. 系统架构

```
用户浏览器
  └── SDK (IIFE)          # 埋点脚本，<script> 引入，无依赖
        │  X-Site-Token
        │  X-LiteTrack-SDK
        ▼
  Nginx (admin 容器)       # 统一入口 :8080
  ├── /litetrack/*  →  反代 → Fastify 后端
  ├── /sdk/*        →  静态文件（版本化 SDK）
  └── /*            →  Vue 3 管理后台 SPA
        │
        ▼
  Fastify 后端 (server 容器)
  ├── /health                    # 健康检查（不带版本，供容器探活）
  ├── 【公共契约 · 带版本】
  │   └── /litetrack/v1/track/*    # SDK 上报 & 公开统计查询
  └── 【内部接口 · 不带版本】
      ├── /litetrack/api/auth/*    # GitHub OAuth
      ├── /litetrack/api/sites/*   # 站点 & Token 管理
      └── /litetrack/api/stats/*   # 后台数据查询（JWT 鉴权）
        │
   ┌────┴────┐
PostgreSQL    Redis
（持久化）   （限流）
```

### 2.1 接口分类与版本策略

后端接口按**受众**分为两类，版本策略截然不同：

| 类别         | 前缀             | 调用方   | 版本策略                                                    |
| ------------ | ---------------- | -------- | ----------------------------------------------------------- |
| **公共契约** | `/litetrack/v1`  | SDK      | **带版本**。契约稳定，只允许向后兼容改动，破坏性变更才升 v2 |
| **内部接口** | `/litetrack/api` | 后台前端 | **不带版本**。与前端一起部署，可自由演进，改了前后端一起发  |

**两个版本号刻意解耦**（这是关键设计，避免「SDK 一升大版本就打到不存在的 /v2 → 埋点静默失效」）：

- **SDK 语义化版本**（npm semver）：面向接入方开发者，改 JS 公共 API 就升 major，与后端无关，可自由迭代。
- **API 契约版本**（`/v1`）：HTTP wire 协议契约，由 SDK 源码 `src/core/version.ts` 的 `API_VERSION` 常量**显式声明**，不从 SDK 大版本号推导。

判断「要不要升 v2」只看一条规则：

| 改动类型                                          | 是否升 v2     | 做法                                                      |
| ------------------------------------------------- | ------------- | --------------------------------------------------------- |
| 加可选上报字段 / 加新端点 / 内部重构              | **否**，留 v1 | SDK 升 minor/patch，CI 自动发版                           |
| 删/改必填字段、改字段语义、改鉴权方式、改响应结构 | **才升 v2**   | 后端新增 v2 路由树（保留 v1），SDK 同 PR 改 `API_VERSION` |

- **Tolerant reader 纪律**：`track` 上报 schema 必须「只增不改」——新字段一律可选、未知字段忽略，让 v1 尽量**永不升级**。
- 升 v2 时后端需**同时保留 v1**，靠 `X-LiteTrack-SDK` 头观测老版本流量，确认无 1.x 流量后才可下线 v1。埋点 SDK 嵌在客户页面里，老版本存活数年，v1 几乎不可删除。

### 2.2 SDK 版本与发布流程（Changesets）

SDK（`@boses/litetrack-sdk`）是唯一发布到 npm 的包，版本由 **Changesets** 管理，发版是**刻意动作**而非每次提交的副作用：

1. 改 SDK 时附一个 changeset（`pnpm changeset`，声明 patch/minor/major + 说明）。
2. 合并到 master → CI 自动开 **"Version Packages" PR**（算好版本号、生成 CHANGELOG）。
3. 合并该 PR = 发版：版本号落到 master，CI 把产物写入 `apps/admin/public/sdk/<version>/`（带 SRI 的 CDN 历史）+ 发布到 npm。

**关键不变量**：

- **本地/CDN 版本号 == npm 版本号**：二者同源于 `apps/sdk/package.json`，天然一致。
- **已发布版本不可变（immutable）**：npm 强制不可重发；`publish.mjs` 也冻结已存在的 CDN 版本目录绝不覆盖。原因——客户页面以固定 URL + SRI `integrity` 加载，覆盖字节会令校验失配、脚本被浏览器拒绝执行。改内容必须升新版本号。
- `manifest.json` 的 `versions[]` 是**不可变历史档案**，`channels`（如 `v1.latest`）是**指向最新版的可变指针**。
- **禁止手动改版本号**，一律走 changeset，避免误发与版本泛滥。

---

## 3. 功能模块

### 3.1 数据采集

#### 3.1.1 页面访问上报（PV）

- SDK **不自动上报**，由接入方在合适时机显式调用 `tracker.page()`。
- 不传参时自动读取 `window.location.pathname` 和 `document.title`；SPA 场景在路由钩子中调用并传入当前路径。
- 上报字段：`path`（标准化路径）、`title`、`visitorId`、`sessionId`、`language`（自动读取 `navigator.language`）、`utmSource / utmMedium / utmCampaign`（自动解析 URL query 参数）。
- 后端基于 `IP + siteId + path + 10s` 窗口限流，防止同一访客重复计数。

#### 3.1.2 阅读深度上报

- SDK **不内置滚动监听**，由接入方自行监听滚动事件并在适当时机调用 `tracker.read(percent)`。
- 上报百分比（0–100），超出范围自动 clamp；路径不传时沿用上一次 `page()` 的路径。
- 每个访客每天每页只保留最大深度，不重复写入。

#### 3.1.3 页面停留时长上报

- SDK 在每次 `page()` 调用时内部启动计时器。
- 计时结束条件：调用下一次 `page()`（SPA 路由切换）或页面触发 `beforeunload`（关闭标签页 / 导航离开）。
- 自动调用 `POST /track/duration { path, visitorId, duration }` 上报秒级停留时长；时长 < 1 秒的忽略。
- 调用 `tracker.destroy()` 时自动移除 `beforeunload` 监听器。

#### 3.1.4 访客识别

- `visitorId`：写入 `localStorage`，跨 session 持久，标识同一浏览器。
- `sessionId`：写入 `sessionStorage`，关闭标签页后重置，标识单次会话。
- 无 storage 时降级为内存存储，不报错。

### 3.2 数据查询与统计

| 接口                           | 说明                                   | 鉴权       |
| ------------------------------ | -------------------------------------- | ---------- |
| `GET /stats/dashboard`         | 全站聚合：站点数、今日 PV、总 PV       | JWT        |
| `GET /stats/:siteId`           | 站点概览：总 PV、页面数、30 天趋势     | JWT        |
| `GET /stats/:siteId/trend`     | 自定义天数趋势图（1–365 天）           | JWT        |
| `GET /stats/:siteId/popular`   | 热门页面 Top 10                        | JWT        |
| `GET /stats/:siteId/pages`     | 页面列表（分页 / 搜索 / 排序）         | JWT        |
| `GET /stats/:siteId/visitors`  | UV 趋势 / 今日独立访客                 | JWT        |
| `GET /stats/:siteId/devices`   | 设备 / 浏览器 / 操作系统分布           | JWT        |
| `GET /stats/:siteId/reading`   | 阅读深度分布 / 完成率                  | JWT        |
| `GET /stats/:siteId/referrers` | 流量来源域名 Top 20                    | JWT        |
| `GET /stats/:siteId/bounce`    | 跳出率 / 总会话数                      | JWT        |
| `GET /stats/:siteId/duration`  | 页面平均停留时长 Top 20                | JWT        |
| `GET /stats/:siteId/languages` | 访客浏览器语言分布                     | JWT        |
| `GET /stats/:siteId/campaigns` | UTM 来源 / 媒介 / 活动分布             | JWT        |
| `GET /stats/:siteId/geo`       | 访客地理分布（国家 / 城市）            | JWT        |
| `GET /stats/:siteId/logs`      | 访问日志（分页 / 路径过滤 / 时间范围） | JWT        |
| `GET /track/stats`             | 公开 PV 查询（供页面展示用）           | Site Token |
| `POST /track/duration`         | 上报页面停留时长（SDK 内部调用）       | Site Token |

### 3.3 站点与 Token 管理

- 支持为一个账号添加**多个站点**（域名唯一约束）。
- 每个站点可创建**多个 Site Token**，支持命名和描述。
- Token 可独立停用（`isActive = false`）而不删除历史数据。
- 删除站点时级联清除所有统计数据。

### 3.4 认证

- 使用 **GitHub OAuth** 登录，不维护独立账密。
- JWT 有效期 30 天，存于客户端（admin 前端管理）。
- 后端不存储 GitHub access token，仅用于获取用户信息后丢弃。

### 3.5 SDK 版本管理

- 所有历史版本的 IIFE 均托管在 admin 静态服务（`/sdk/<version>/litetrack.min.js`），已发布版本**不可变**（见 2.2 节）。
- 版本号由 **Changesets** 管理（禁止手动 bump，流程见 2.2 节）；版本提升 PR 合并后，CI 自动：构建 → 复制到 `apps/admin/public/sdk/<version>/` → 更新 `manifest.json` → 发布至 npm（`@boses/litetrack-sdk`）。
- Admin 后台"SDK 版本"页面展示所有版本，含 SRI integrity、文件大小、一键复制接入代码。
- npm 包同时提供 ESM 产物与完整 TypeScript 类型声明，供打包工具（Vite / webpack 等）直接 import 使用。

#### npm 发布机制（Trusted Publishing / OIDC）

- 采用 npm **Trusted Publishing**：CI 通过 GitHub OIDC（`id-token: write`）免 token 发布，并自动附带 provenance 溯源，**无需在仓库配置 `NPM_TOKEN`**。
- 发布命令：`npm publish --provenance --access public`（要求 npm ≥ 11.5.1，CI 中已加 `npm install -g npm@latest` 兜底）。
- CI 按版本号去重：若 `@boses/litetrack-sdk@<version>` 已存在则跳过，避免重复发布。
- **首次启用需手动一次性配置**（仅一次）：
  1. 本地 `npm login`（账号需对 `@boses` scope 有发布权限）→ `pnpm -C apps/sdk build` → `cd apps/sdk && npm publish --access public` 手动发首版。
  2. 在 npmjs.com 包的 Settings → Trusted Publisher 配置 GitHub Actions：Organization/user = `bosens-China`，Repository = `LiteTrack`，Workflow filename = `docker-and-sdk.yml`。
- 配置完成后即进入 Changesets 流程：提交 changeset → 合并 "Version Packages" PR 完成版本提升 → CI 自动发版（详见 2.2 节），无需手动改版本号。

---

## 4. 管理后台页面

### 4.1 页面列表

| 路由         | 页面     | 功能                                           |
| ------------ | -------- | ---------------------------------------------- |
| `/login`     | 登录     | GitHub OAuth 入口                              |
| `/`          | 仪表盘   | 全站统计卡片、站点列表快速跳转                 |
| `/sites`     | 网站管理 | 站点列表（含 Token 数量徽标）、新增站点        |
| `/sites/:id` | 网站详情 | 四 Tab 布局：概览 / 受众分析 / 访问日志 / 设置 |
| `/sdk`       | SDK 版本 | 版本列表、接入代码生成                         |

### 4.2 网站详情 Tab 结构

#### 概览 Tab

| 模块     | 核心指标                                                                 |
| -------- | ------------------------------------------------------------------------ |
| 统计卡片 | 总 PV、今日 PV、总页数（三卡片行）                                       |
| 趋势图   | 7 / 30 / 90 / 365 天折线图（PV）                                         |
| 热门页面 | Top 10，含访问量；「查看全部」按钮打开分页弹窗（支持搜索 / 排序 / 分页） |
| 访客概览 | UV 趋势、今日 / 周期内独立访客数                                         |

#### 受众分析 Tab

| 模块     | 核心指标                                                         |
| -------- | ---------------------------------------------------------------- |
| 设备分析 | 设备类型 / 浏览器 / 操作系统分布（横向条形图，含占比）           |
| 阅读分析 | 25/50/75/100% 深度漏斗、平均阅读深度、完成率；支持按页面路径筛选 |

#### 访问日志 Tab

| 模块     | 核心指标                                  |
| -------- | ----------------------------------------- |
| 访问日志 | 原始日志表格，按路径 / 日期范围筛选，分页 |

#### 设置 Tab

| 模块       | 功能                                                 |
| ---------- | ---------------------------------------------------- |
| 基本信息   | 展示站点域名、创建时间等；支持编辑                   |
| Token 管理 | 创建 / 停用 / 删除 Token，表格展示，操作按钮常驻可见 |

---

## 5. 数据模型

```
User
  └── Site（多对一）
        ├── SiteToken（多）
        ├── PageView（总 PV 聚合，唯一键：siteId + path）
        ├── DailyView（每日 PV，唯一键：siteId + date）
        ├── DailyVisitor（每日 UV，唯一键：siteId + date + visitorId）
        ├── PageDailyVisitor（页面每日 UV，唯一键：siteId + path + date + visitorId）
        ├── PageReadProgress（阅读进度，唯一键：siteId + path + date + visitorId）
        ├── PageDuration（停留时长，siteId + path + date，无唯一约束，按均值聚合）
        └── AccessLog（原始日志，含 IP / UA / 设备 / Referer / Language / UTM / 国家 / 城市）
```

---

## 6. 非功能需求

### 6.1 性能

- 上报接口（`POST /track`）为 fire-and-forget，不阻塞页面渲染。
- 使用 `fetch` + `keepalive: true`，保证页面关闭时上报不丢失。
- Redis 限流避免高频上报打穿数据库。

### 6.2 安全

- Site Token 为 64 位十六进制随机字符串（`crypto.randomBytes(32)`）。
- JWT secret 强制通过环境变量注入，不允许空值。
- 后端使用 Prisma 参数化查询，无 SQL 注入风险。
- 错误响应在生产环境不暴露内部堆栈信息。
- 开启 Fastify `onProtoPoisoning` / `onConstructorPoisoning` 防原型污染。

### 6.3 部署

- 单 `docker-compose.prod.yml` 完成全栈部署（PostgreSQL + Redis + Server + Admin/Nginx）。
- 无额外中间件依赖，最低 1 核 512 MB 可运行。
- 时区通过 `APP_TIMEZONE` 环境变量配置，默认 `Asia/Shanghai`。

---

## 7. SDK 接入规范

### 7.1 基本接入

**方式一：CDN `<script>` 标签（IIFE）**

```html
<!-- 推荐使用固定版本 + SRI 校验，确保可重现且安全 -->
<script
  src="https://your-domain.com/sdk/1.0.0/litetrack.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
<script>
  const tracker = window.LiteTrack.create({
    siteToken: 'YOUR_SITE_TOKEN',
    baseUrl: 'https://your-domain.com', // 只填服务器源，不带 /litetrack/v1
  });

  // 在需要时手动上报
  tracker.page(); // 上报当前页面访问
</script>
```

**方式二：npm 包（ESM，适合打包工具）**

```js
import { create } from '@boses/litetrack-sdk';

const tracker = create({
  siteToken: 'YOUR_SITE_TOKEN',
  baseUrl: 'https://your-domain.com',
});

tracker.page();
```

### 7.2 SDK 版本语义

| 变更类型               | 版本升级               | 说明                   |
| ---------------------- | ---------------------- | ---------------------- |
| 修复 bug、优化性能     | patch（1.0.0 → 1.0.1） | 无破坏性               |
| 新增可选功能、新增接口 | minor（1.0.0 → 1.1.0） | 无破坏性               |
| 修改现有行为、删除功能 | major（1.x → 2.0.0）   | 破坏性，需同步升级后端 |

### 7.3 SPA 接入

SDK 不内置路由感知，由接入方在框架的路由钩子中调用：

```js
// Vue Router
router.afterEach((to) => {
  tracker.page({ path: to.path, title: document.title });
});

// React Router（v6 loader / useEffect）
useEffect(() => {
  tracker.page({ path: location.pathname });
}, [location.pathname]);
```

阅读深度同理，在滚动回调中按需上报：

```js
window.addEventListener(
  'scroll',
  () => {
    const percent = Math.round(
      ((window.scrollY + window.innerHeight) / document.body.scrollHeight) *
        100,
    );
    tracker.read(percent);
  },
  { passive: true },
);
```

---

## 8. 已知限制与待解决问题

| 问题                                                  | 严重性 | 现状                                                   |
| ----------------------------------------------------- | ------ | ------------------------------------------------------ |
| Track 接口缺少 Origin 校验，Site Token 可被滥用刷数据 | 高     | ✅ 已修复（`validateOrigin` 比对站点域名）             |
| `/read-progress` 无限流，轮换 visitorId 可无限写入    | 高     | ✅ 已修复（Redis INCR 计数限流 120次/分钟）            |
| `/track` POST 无细粒度限流                            | 高     | ✅ 已修复（IP+siteId+path 10s 窗口限流）               |
| 生产 CORS 配置为 `origin: true`（允许所有来源）       | 中     | ✅ 已修复（`CORS_ORIGIN` 环境变量白名单化）            |
| OAuth state 仅做客户端校验，服务端无一次性比对        | 中     | ✅ 已修复（Redis SETEX 存 state，回调时 GET+DEL 核销） |
| Sites 路由 params 用 `parseInt` 无 NaN 防护           | 低     | ✅ 已修复（`parseId` 工具函数，非正整数返回 400）      |

---

## 9. 后续规划

### 9.1 短期（下一个迭代）

- [x] 修复第 8 节已知安全问题（全部已完成）
- [ ] 完整部署文档（含 HTTPS / 反向代理 / 域名配置）

### 9.2 中期

- [ ] Referrer 聚合面板（来源域名统计）
- [ ] 实时在线人数（WebSocket 或短轮询）
- [x] 地理位置统计（国家/城市）：内置离线库 `ip2region`（按 `request.ip` 查询，国内省/市定位准、海外到国家），叠加可信反代头 `CF-IPCountry` / `X-Geo-*` 作为优先覆盖。无外网依赖、无需 license key；前提是开启 `TRUST_PROXY` 以拿到真实客户端 IP
- [ ] 访问日志导出（CSV）

### 9.3 长期

- [ ] 多成员协作（站点级别权限）
- [ ] 告警规则（流量异常通知）
- [ ] 更多 OAuth 提供商（Gitee、GitLab）

---

## 附录

### A. 环境变量清单

| 变量                     | 必填 | 默认值                                | 说明                                  |
| ------------------------ | ---- | ------------------------------------- | ------------------------------------- |
| `DATABASE_URL`           | ✅   | —                                     | PostgreSQL 连接串                     |
| `REDIS_URL`              |      | `redis://localhost:6379`              | Redis 连接串                          |
| `JWT_SECRET`             | ✅   | —                                     | JWT 签名密钥，生产需强随机值          |
| `JWT_EXPIRES_IN`         |      | `30d`                                 | JWT 有效期                            |
| `GITHUB_CLIENT_ID`       | ✅   | —                                     | GitHub OAuth App Client ID            |
| `GITHUB_CLIENT_SECRET`   | ✅   | —                                     | GitHub OAuth App Client Secret        |
| `GITHUB_CALLBACK_URL`    |      | `http://localhost:8080/auth/callback` | OAuth 回调地址                        |
| `APP_TIMEZONE`           |      | `Asia/Shanghai`                       | 日期归档时区                          |
| `PORT`                   |      | `3000`                                | 后端监听端口                          |
| `HOST`                   |      | `0.0.0.0`                             | 后端监听地址                          |
| `TRUST_PROXY`            |      | `false`                               | 是否信任代理（Nginx 反代时设 `true`） |
| `LOG_LEVEL`              |      | `info`                                | 日志级别                              |
| `LITETRACK_API_UPSTREAM` |      | `server:3000`                         | Admin Nginx 反代目标（compose 内网）  |

### B. 关键技术栈

| 层       | 技术                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 后端     | Fastify 5 · Prisma 7 · PostgreSQL 16 · Redis 7 · Zod 4                    |
| 前端     | Vue 3 · Element Plus · Rsbuild · Pinia · Vue Router 4                     |
| SDK      | TypeScript · tsdown（Rolldown）· IIFE + ESM · npm（@boses/litetrack-sdk） |
| 基础设施 | Docker Compose · Nginx · GitHub Actions                                   |
