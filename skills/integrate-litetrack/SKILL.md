---
name: integrate-litetrack
description: 为网站接入 LiteTrack 页面访问统计，选择 npm SDK、本地 JS 与类型文件或粘贴 Script，处理 SPA 路由、SSR 和接入验证。用于安装、集成或排查 LiteTrack 采集，不用于部署 LiteTrack 服务端。
---

# 接入 LiteTrack

把 LiteTrack 接入用户已有的网站，不改造宿主应用的架构。此技能适用于重构后的 SDK 2.x 起的新接口，不兼容旧版 1.x SDK。

## 确认接入信息

- 先查看宿主项目的包管理器、框架、路由和已有统计代码，避免重复接入。
- 需要 LiteTrack 服务根地址 `baseUrl`、项目 API Key、与服务配套的 SDK 版本，以及接入方式。可从项目设置的「SDK 接入」取得；缺失且不能从项目配置确认时询问用户，不猜测域名、Key 或版本。
- `baseUrl` 不追加 `/litetrack/collect`；`siteToken` 参数承载 API Key，格式为 64 位小写十六进制。项目域名必须匹配实际页面的 host，含非默认端口。
- API Key 是浏览器公开采集凭据，不是 GitHub token、后台 Cookie 或 JWT。不读取管理凭据来代替它，不把 Key 写入技能、安装命令或诊断日志。
- 正式接入使用后台提供的固定版本；不要盲装 npm latest 或旧 1.1.1。未正式发布时，只在用户明确开发验收时使用后台的 `/sdk/preview/` 文件，不用预览冒充稳定依赖。

## 选择一种方式

尊重用户指定方式，否则有包管理的应用优先 npm，不能安装 npm 的项目使用本地文件，普通 HTML 使用 Script。同一页面不要混用多种方式初始化采集。

### npm

按宿主项目的包管理器安装后台显示的版本。以下 `VERSION` 必须替换为实际版本：

```sh
pnpm add @boses/litetrack-sdk@VERSION
```

创建应用级实例，替换示例配置：

```ts
import { create } from '@boses/litetrack-sdk';

export const tracker = create({
  baseUrl: 'https://analytics.example.com',
  siteToken: 'YOUR_API_KEY',
  onError(error) {
    console.warn('LiteTrack', error.code, error.status);
  },
});
```

### 本地 JS + 类型（无需 npm）

从项目设置复制或下载同一构建的 `index.mjs` 与 `index.d.mts`，放入宿主项目同一目录并保留文件名。两者自包含，不需要安装私有契约包。将上例导入改为：

```ts
import { create } from './index.mjs';
```

浏览器直接导入时使用 module 脚本，静态服务器需提供正确的 JavaScript MIME 类型。不要把 `.d.mts` 当运行时脚本加载。复制文件不会自动升级，更新时同步替换 JS 和类型。

### Script 粘贴

优先原样使用后台 Script 标签中的完整代码，保留固定版本 URL、`integrity` 和 `crossorigin`。普通 HTML 的最小结构如下，替换服务地址、`VERSION` 和 Key：

```html
<script src="https://analytics.example.com/sdk/VERSION/litetrack.min.js"></script>
<script>
  const tracker = LiteTrack.create({
    baseUrl: 'https://analytics.example.com',
    siteToken: 'YOUR_API_KEY',
  });
  tracker.page();
</script>
```

先加载 SDK，再执行初始化；不要只给外部脚本添加 async/defer，却让后面的内联初始化立即执行。严格 CSP 环境沿用宿主的 nonce 或外部初始化文件，并配置对应的 script-src/connect-src，不关闭 CSP。

## 页面与路由上报

- `create()` 只初始化，不上报。页面实际打开、标题就绪后显式调用 `tracker.page()`；默认使用 pathname 和 document.title。
- SPA 在成功完成路由导航后调用 `page({ path, title })`。接入宿主已有路由钩子，不同时添加路由钩子和全局 history 监听。首次进入也要上报。
- Hash 路由显式传入逻辑路径，例如 `page({ path: location.hash.replace(/^#/, '') || '/' })`；默认不解析 Hash。不要把含敏感 query 的 URL 当 path。
- 复用同一应用级实例，不在 render、每次路由或每次 effect 中重新 create。同实例连续同路径去重，A → B → A 是三条事件；刷新会生成新事件。
- React StrictMode 重复 effect 可由同实例去重；不要在页面 effect 清理中 destroy 仍要复用的应用实例。只有应用真正卸载时才停止实例并移除宿主添加的监听器。
- SSR 可导入和 create，但 `page()` 必须在浏览器页面/路由完成后调用，服务端调用不采集。
- `destroy()` 幂等停止后续上报，不能重启该实例，已开始的请求仍可完成。
- `page()` 返回 void，不要 await 它当作送达确认。`newVisit: true` 只绕过同路径去重，不强制开启服务端会话；通常不设置。
- 只采集页面事件；不要调用旧版 read、identify/resetIdentity 或统计查询 API。没有自动重试、离线队列或退出必达保证。

## 验证与交付

1. 运行宿主项目相关的类型检查、Lint 和构建。确认只接入一套 SDK，且生产配置没有示例占位值。
2. 浏览器检查请求发往正确服务的 `POST /litetrack/collect`，带 X-Site-Token，得到成功响应。检查初始化本身不发送事件，首次打开、成功路由切换和刷新能上报，连续同路径不重复。
3. 登录后台确认项目的 PV、UV、Visits 和页面路径符合实际操作。UV 是匿名浏览器估计值；清理存储、更换 Key 或浏览器可重新计数。
4. 失败先看 `onError` 和 Network：401 检查 Key 是否正确/启用，403 检查项目域名与 Origin，400 检查 SDK 与服务协议是否配套，429 检查限流；网络失败检查服务地址、HTTPS、CORS/CSP 与阻止请求的扩展。不通过禁用安全检查或不断重试掩盖错误。

交付时说明使用的接入方式和固定版本、改动位置、实际验证结果及未验证事项。不能访问后台时明确说明，不能把编译成功当作数据已入库。

详细 API、框架示例与当前行为见 [LiteTrack SDK 文档](https://github.com/bosens-China/LiteTrack/blob/master/apps/sdk/README.md)。不要为接入网站重新部署或修改 LiteTrack 服务端。
