# LiteTrack Admin

React 19 + TypeScript + Ant Design 6，Rsbuild 2 启用 React Compiler。使用 React Router、TanStack Query 和 ECharts；不再依赖 Vue、Pinia 或 Element Plus。

Ant Design 使用默认主题，只设置中文 locale，没有主题 Token 覆盖；布局使用 Layout、Menu、Breadcrumb、Card、Statistic；桌面使用侧栏，窄屏使用抽屉导航，图表颜色取默认主题 Token。图标统一使用 `@ant-design/icons`，与文字并列的装饰图标需加 `aria-hidden`，避免英文图标名混入按钮和菜单的可访问名称；自定义样式优先引用 `var(--ant-*)` 变量。

## 开发

先运行根目录的 `pnpm dev`，统一准备共享契约、SDK 预览产物和 Prisma Client，再启动后台与 API。

只启动后台时：

```bash
pnpm --filter @litetrack/contracts build
pnpm --filter admin dev
```

默认 [http://localhost:8080](http://localhost:8080)，同源 `/litetrack` 代理到 3000；可通过 API_UPSTREAM 修改开发代理。OAuth 和登录 Cookie 由服务端负责，浏览器不保存 JWT。

## 页面

- `/`：全局汇总；`?project=<id>` 切换单项目统计，包含日期筛选、趋势、热门页面与来源。
- `/sites`：项目列表、今日指标和新建项目；`?create=1` 直接打开创建弹窗，`?page=2` 定位列表页码。
- `/sites/settings`：项目设置入口，选择项目后进入 `/sites/:id/settings`。
- `/sites/:id/settings`：项目资料、API Key 文本复制与启停/删除、永久删除。
- `/integration`：统一 SDK/npm/Script/本地文件与 AI Skills 指南；`?project=<id>` 自动填充该项目启用的 Key，未选项目时仍可阅读公共内容。
- `/sites/:id`：旧统计地址重定向到 `/?project=<id>`，保留日期和分页。

项目管理使用「项目列表／项目设置」二级菜单；直接访问设置或刷新后自动展开并选中对应入口。窄屏抽屉展开/收起父菜单不导航、不关闭，点击叶子入口后关闭。统计、设置与接入指南的入口携带当前项目上下文。

项目、日期和分页保存到 URL；改日期保留项目，切换项目重置热门页面页码，刷新与前进后退恢复筛选。非法或无权限项目明确报错，不切到其他项目。统计日为 Asia/Shanghai。服务器状态由 React Query 管理；各查询携带 AbortSignal，隔离不同站点/日期的响应。列表中的 UV 合计是各站点 UV 相加，不是跨站去重人数。

创建项目在数据库内同时生成默认 API Key，成功弹窗支持复制和直接进入对应项目接入指南；设置页直接展示可复制文本，没有可用 Key 时才提供生成入口。

生产构建从 SDK package.json 和 current.json 确认当前静态 SDK；npm 发布状态另从 Registry 查询，只有当前正式 SDK 在 Registry 有对应版本时才提供安装命令。开发预览不会误报“npm 从未发布”，也不会引导安装旧协议版本。Registry 不可达时显示重试入口。本地文件、Script 和 npm 示例均提供代码高亮与复制。项目所有者可再次查看和复制已有 API Key。接入指南提供自包含的 index.mjs 和 index.d.mts 全文复制、下载及使用示例，接入不依赖 npm 安装。

## 检查

```bash
pnpm --filter admin type-check
pnpm --filter admin lint
pnpm --filter admin build
```

实际浏览器验收脚本在 [server/test/browser.mts](../server/test/browser.mts)，覆盖项目创建、API Key 取回复制、SDK 文件复制下载、ESM/IIFE 采集、图表、桌面与窄屏；[导航验收](../server/test/browser/admin-navigation.mts) 另覆盖全局/项目切换、二级导航、日期/历史/分页恢复、无权限项目与 Key 隔离。完整命令见 [Server 文档](../server/README.md)。
