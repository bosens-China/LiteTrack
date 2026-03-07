# LiteTrack

轻量级网站访问统计分析平台

## 简介

LiteTrack 是一个简单易用的网站访问统计系统，帮助您了解网站的访问情况。

## 技术栈

- **后端**: Fastify + TypeScript + Prisma + PostgreSQL + Redis
- **前端**: Vue 3 + Rsbuild + Naive UI + Tailwind CSS
- **SDK**: TypeScript，支持 ESM/CJS，框架无关

## 快速开始

### 1. 启动数据库

```bash
# 项目根目录
docker-compose up -d
```

### 2. 配置后端

```bash
cd apps/server

# 1. 复制并编辑环境变量
cp .env.example .env
# 编辑 .env 设置 GitHub OAuth

# 2. 初始化数据库
pnpm db:generate
pnpm db:push

# 3. 启动服务
pnpm dev
```

### 3. 配置前端

```bash
cd apps/admin

# 1. 复制并编辑环境变量
cp .env.example .env
# 编辑 .env 设置 API 地址

# 2. 启动服务
pnpm dev
```

### 4. 使用 SDK

```bash
cd apps/sdk
pnpm build
pnpm link --global

# 在其他项目使用
pnpm link --global litetrack-sdk
```

```typescript
import { init, track } from 'litetrack-sdk'

init({ token: 'your-site-token' })
track('/blog/hello-world')
```

## 项目结构

```
LiteTrack/
├── apps/
│   ├── server/     # 后端 API
│   ├── admin/      # 管理后台
│   └── sdk/        # 统计 SDK
├── docker-compose.yml
└── package.json
```

## 功能特性

- ✅ GitHub OAuth 登录
- ✅ 多网站管理
- ✅ 页面访问量统计（PV）
- ✅ 每日访问趋势
- ✅ 热门页面排行
- ✅ IP + 路径 10秒防刷
- ✅ 轻量级 SDK（< 1KB gzip）

## 开发文档

- [后端文档](./apps/server/README.md)
- [前端文档](./apps/admin/README.md)
- [SDK 文档](./apps/sdk/README.md)

## 许可证

MIT
