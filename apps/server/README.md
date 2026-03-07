# LiteTrack Server

LiteTrack 统计分析后端 API 服务

## 🚀 快速开始

### 1. 启动数据库服务

在项目根目录运行：

```bash
docker-compose up -d
```

这会启动：
- PostgreSQL（端口 25432）
- Redis（端口 26379）

### 2. 配置环境变量

编辑 `apps/server/.env`：

```env
# 数据库（默认配置）
DATABASE_URL="postgresql://litetrack:litetrack_password@localhost:25432/litetrack"

# Redis（默认配置）
REDIS_URL="redis://localhost:26379"

# JWT（生产环境请修改为随机字符串）
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# GitHub OAuth（需要在 GitHub 创建 OAuth 应用）
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
# 回调 URL 必须与 GitHub 设置完全一致
GITHUB_CALLBACK_URL="http://localhost:5173/auth/callback"
```

### 3. 初始化数据库

```bash
# 生成 Prisma 客户端
pnpm db:generate

# 推送 schema 到数据库
pnpm db:push
```

### 4. 启动开发服务器

```bash
pnpm dev
```

服务将在 http://localhost:3000 启动

## 📚 API 文档

所有 API 路由前缀为 `/litetrack/v1`

### 认证相关

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/auth/github` | GitHub OAuth 登录入口 |
| GET | `/auth/github/callback` | GitHub OAuth 回调 |
| GET | `/auth/me` | 获取当前用户（需要 JWT） |

### 网站管理（需要 JWT）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/sites` | 获取用户的所有网站 |
| POST | `/sites` | 创建新网站 |
| GET | `/sites/:id` | 获取网站详情（包含令牌） |
| PATCH | `/sites/:id` | 更新网站信息 |
| DELETE | `/sites/:id` | 删除网站 |
| POST | `/sites/:id/tokens` | 创建新访问令牌 |
| DELETE | `/sites/:siteId/tokens/:tokenId` | 撤销令牌 |

### 统计数据（需要 JWT）

| 方法 | 路由 | 说明 |
|------|------|------|
| GET | `/stats/:siteId` | 获取综合统计 |
| GET | `/stats/:siteId/popular` | 前 10 热门页面 |
| GET | `/stats/:siteId/trend` | 访问趋势（默认 30 天） |

### 数据上报（需要 Site Token）

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/track` | 上报页面访问 |
| GET | `/track/verify` | 验证令牌有效性 |

**Track 请求示例：**

```bash
curl -X POST http://localhost:3000/litetrack/v1/track \
  -H "Content-Type: application/json" \
  -H "X-Site-Token: your-site-token" \
  -d '{"path": "/blog/hello-world"}'
```

## 🔐 GitHub OAuth 设置

1. 访问 https://github.com/settings/applications/new
2. 填写应用信息：
   - **Application name**: LiteTrack（本地开发）
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:5173/auth/callback
3. 创建后复制 Client ID 和 Client Secret
4. 填入 `apps/server/.env`

## 📦 数据库模型

```
User（GitHub 登录用户）
  └── Site（网站）
        ├── SiteToken（访问令牌）
        ├── PageView（页面访问统计）
        └── DailyView（每日访问统计）
```

## 🛠️ 常用命令

```bash
# 启动数据库
docker-compose up -d

# 停止数据库
docker-compose down

# 查看数据库内容
pnpm db:studio

# 重置数据库
pnpm db:migrate reset

# 编译 TypeScript
pnpm build:ts

# 代码检查
pnpm lint

# 类型检查
pnpm check
```

## 🏗️ 项目结构

```
src/
├── lib/           # 共享库（prisma、redis、config）
├── plugins/       # Fastify 插件（jwt、cors）
└── routes/        # 按功能组织的 API 路由
    ├── auth/      # 认证路由
    ├── sites/     # 网站管理路由
    ├── stats/     # 统计路由
    └── track/     # 追踪路由（公开）
```

## 📖 应用的最佳实践

- **Prisma Client**：单例模式防止连接池耗尽
- **Fastify 插件**：模块化插件架构，正确封装
- **类型安全**：完整的 TypeScript 支持，声明合并
- **速率限制**：基于 Redis 的 IP + 路径限流（10 秒窗口）
- **环境变量**：Zod schema 验证实现类型安全配置
