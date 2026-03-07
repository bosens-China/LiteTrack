# LiteTrack Admin

LiteTrack 管理后台前端

## 技术栈

- Vue 3 + TypeScript
- Rsbuild（构建工具）
- Naive UI（组件库）
- Tailwind CSS（样式）
- Pinia（状态管理）
- Vue Router（路由）
- ECharts（图表）

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务器
pnpm dev
```

服务将在 http://localhost:5173 启动

## 环境变量

创建 `.env` 文件：

```env
PUBLIC_API_BASE_URL=http://localhost:3000/litetrack/v1
```

## 项目结构

```
src/
├── api/           # API 请求封装
│   ├── auth.ts
│   ├── sites.ts
│   └── stats.ts
├── components/    # 公共组件
│   └── Layout.vue
├── router/        # 路由配置
│   └── index.ts
├── stores/        # Pinia 状态
│   ├── auth.ts
│   └── sites.ts
├── views/         # 页面
│   ├── Login.vue
│   ├── AuthCallback.vue
│   ├── Dashboard.vue
│   ├── Sites.vue
│   ├── NewSite.vue
│   └── SiteDetail.vue
├── App.vue
└── main.ts
```

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 预览
pnpm preview

# 代码检查
pnpm lint
```

## 页面路由

| 路由             | 页面     | 说明               |
| ---------------- | -------- | ------------------ |
| `/login`         | 登录页   | GitHub OAuth 登录  |
| `/auth/callback` | 登录回调 | 处理 GitHub 回调   |
| `/`              | 仪表盘   | 网站统计概览       |
| `/sites`         | 网站列表 | 管理所有网站       |
| `/sites/new`     | 创建网站 | 添加新网站         |
| `/sites/:id`     | 网站详情 | 查看统计、管理令牌 |

## 与后端对接

确保后端服务已启动：http://localhost:3000

GitHub OAuth 回调地址设置为：`http://localhost:5173/auth/callback`
