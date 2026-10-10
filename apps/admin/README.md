# LiteTrack Admin

React 19 + TypeScript + Ant Design 6，Rsbuild 2 启用 React Compiler。使用 React Router、TanStack Query 和 ECharts；不再依赖 Vue、Pinia 或 Element Plus。

Ant Design 使用默认主题，只设置中文 locale，没有主题 Token 覆盖；页面布局与图表仍使用项目自身样式。

## 开发

先运行根目录的 `pnpm dev`，统一准备共享契约、SDK 预览产物和 Prisma Client，再启动后台与 API。

只启动后台时：

```bash
pnpm --filter @litetrack/contracts build
pnpm --filter admin dev
```

默认 [http://localhost:8080](http://localhost:8080)，同源 `/litetrack` 代理到 3000；可通过 API_UPSTREAM 修改开发代理。OAuth 和登录 Cookie 由服务端负责，浏览器不保存 JWT。

## 页面

- `/`：当前用户的项目、今日指标和新建项目
- `/sites/:id`：日期筛选、PV/UV/Visits、趋势、热门页面与来源
- `/sites/:id/settings`：项目资料、API Key 管理、本地文件/npm/Script 接入、AI Skills 安装命令、删除

日期和分页保存到 URL，统计日为 Asia/Shanghai。服务器状态由 React Query 管理；各查询携带 AbortSignal，隔离不同站点/日期的响应。列表中的 UV 合计是各站点 UV 相加，不是跨站去重人数。

生产构建从 SDK package.json 和 current.json 确认正式版本；尚未发版时显示开发预览，不提供旧 npm 版本的安装命令。项目所有者可再次查看和复制已有 API Key，默认遮罩。设置页提供自包含的 index.mjs 和 index.d.mts 全文复制、下载及使用示例，接入不依赖 npm 安装。

## 检查

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm --filter admin build
```

实际浏览器验收脚本在 [server/test/browser.mts](../server/test/browser.mts)，覆盖项目创建、API Key 取回复制、SDK 文件复制下载、ESM/IIFE 采集、图表、桌面与窄屏。完整命令见 [Server 文档](../server/README.md)。
