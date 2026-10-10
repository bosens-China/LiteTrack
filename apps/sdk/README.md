# @boses/litetrack-sdk

LiteTrack 浏览器页面统计 SDK。支持 npm、独立 ESM JS + TypeScript 类型文件、Script 全局对象三种接入方式；共用一套核心，无运行时依赖。

这是破坏性重构后的用法，不兼容旧服务或旧 SDK。源码 package.json 仍保持 release-please 管理的已发布版本，正式升级必须等待新的主版本发布；不要将旧 npm 1.1.1 当作本轮实现。

## AI 接入技能

在接入项目目录运行，按提示选择使用的 Agent：

```sh
npx skills add bosens-China/LiteTrack --skill integrate-litetrack
```

[integrate-litetrack](../../skills/integrate-litetrack/SKILL.md) 指导 Agent 选择 npm、本地文件或 Script，处理 SPA 路由与接入验证。安装技能不等于安装 SDK，也不会自动创建项目或 API Key；仍需提供服务地址、项目 Key 和配套版本。后台「AI Skills」标签提供同一命令，语法见 [Skills CLI](https://github.com/vercel-labs/skills#install-a-skill)。

## npm

正式发版后安装后台显示的固定版本：

```bash
pnpm add @boses/litetrack-sdk@VERSION
```

```ts
import { create } from '@boses/litetrack-sdk';

export const tracker = create({
  baseUrl: 'https://analytics.example.com',
  siteToken: 'YOUR_64_CHARACTER_SITE_TOKEN',
  onError(error) {
    console.warn(error.code);
  },
});

// 页面实际打开后调用；初始化不会上报。
tracker.page();
```

baseUrl 为统计服务根地址；不要追加 /litetrack/collect。siteToken 为项目设置创建的 API Key，项目所有者可随时再次查看和复制。项目域名必须匹配接入页面的 host，含非默认端口。

## 本地文件（无需 npm）

项目设置的「SDK 接入 / 本地文件」提供同一构建的 index.mjs 和 index.d.mts 全文复制及下载。二者保持同名、同目录，TypeScript 可解析配套声明，无需安装 npm 包或私有契约包。

```ts
import { create } from './index.mjs';

const tracker = create({
  baseUrl: 'https://analytics.example.com',
  siteToken: 'YOUR_64_CHARACTER_SITE_TOKEN',
});
tracker.page();
```

使用复制文件的应用仍需自行更新版本；文件不会自动升级。浏览器直接导入时使用 module 脚本，静态服务器需正确提供 JavaScript MIME 类型。

## 普通 HTML

```html
<script src="https://analytics.example.com/sdk/VERSION/litetrack.min.js"></script>
<script>
  const tracker = LiteTrack.create({
    baseUrl: 'https://analytics.example.com',
    siteToken: 'YOUR_64_CHARACTER_SITE_TOKEN',
  });
  tracker.page();
</script>
```

固定正式版本推荐使用后台生成的 integrity 和 crossorigin 属性。开发使用 /sdk/preview/litetrack.min.js，它可变且不代表 npm 发布版本，不能作为正式固定依赖。

## React 路由

保持一个应用级实例，路由完成后调用：

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { tracker } from './analytics';

export function PageTracking() {
  const location = useLocation();
  useEffect(() => {
    tracker.page({ path: location.pathname });
  }, [location.pathname]);
  return null;
}
```

不要在 render 或每次 effect 中重新 create。同实例同路径去重可吸收 StrictMode 的重复 effect；不要在这个 effect 的清理函数中 destroy 应用级实例，否则开发重挂载后它已失效。标题异步加载时，由应用在标题就绪后明确上报。

## Vue 路由

在应用初始化时创建并复用实例，使用路由的逻辑 path：

```ts
import { tracker } from './analytics';

router.afterEach((to, _from, failure) => {
  if (!failure) tracker.page({ path: to.path });
});
router
  .isReady()
  .then(() => tracker.page({ path: router.currentRoute.value.path }));
```

首次路由钩子和 isReady 可能重复执行，同实例同路径不会重复计数。集成代码归宿主应用所有，SDK 不安装 Vue 或 React。

## Hash 与显式页面

```ts
const trackHash = () =>
  tracker.page({
    path: window.location.hash.replace(/^#/, '') || '/',
  });
trackHash();
window.addEventListener('hashchange', trackHash);
```

应用卸载时移除自己添加的监听器，并调用 tracker.destroy()。默认只采集 pathname，不自动解析 Hash 路由；query/hash 不参与默认页面聚合，路径保留大小写。

## API

| API                                | 行为                                 |
| ---------------------------------- | ------------------------------------ |
| create(options)                    | 返回 Tracker，不发送请求；SSR 安全   |
| page({ path?, title?, newVisit? }) | 浏览器中显式采集页面；返回 void      |
| destroy()                          | 幂等停止后续采集，已开始的请求可完成 |
| version                            | 当前 npm SDK 版本                    |

创建参数包括 baseUrl、siteToken、可选 timeoutMs（默认 10000）、debug 和 onError。非法初始化同步抛错；页面参数或请求失败通过错误回调反馈，不向宿主抛错。

连续同路径 page() 只尝试一次；A → B → A 为三次。显式 newVisit:true 可对同路径再计一条页面事件，不是强制开启服务端会话。刷新页面会产生新的 eventId。

请求错误码：INVALID_OPTIONS、ENVIRONMENT_ERROR、HTTP_ERROR、NETWORK_ERROR、TIMEOUT。onError 可以同步或异步；回调异常不会影响宿主。现代浏览器需要 fetch 和 AbortController。

## 身份与可靠性

- localStorage 按 Token 保存匿名访客 ID；支持 Web Locks 时协调多标签页首次写入。不可用时使用存储或内存降级。
- 无 Web Locks 时首次并发标签页初始化存在竞争；存储禁用时只保证同页面内存复用，不保证刷新/跨标签页身份连续。
- Token 轮换、清理存储、跨浏览器/设备会重新计 UV，UV 不等同真实人数。
- sessionId 和时间由服务端生成；30 分钟无新页面事件时，下次采集开始新会话。
- 只发送协议号、eventId、visitorId、path、title 和 document.referrer；服务端仅保留来源域名。
- fetch keepalive 尽力完成离页上报，不保证退出时必达。没有自动重试、离线队列或历史补传；失败后的同路径去重也不会自动重发。
- 移除 read、阅读/时长监听、identify/resetIdentity、stats 查询等旧 API。

## 构建与验证

```bash
pnpm --filter @litetrack/contracts build
pnpm --filter @boses/litetrack-sdk build
pnpm --filter @boses/litetrack-sdk type-check
pnpm --filter @boses/litetrack-sdk lint
pnpm --filter @boses/litetrack-sdk test
pnpm --filter @boses/litetrack-sdk check-package
```

产物为 dist/index.mjs、dist/index.d.mts 与 dist/index.iife.js。check-package 先验证无需 npm 的本地 ESM + 类型，再实际 pnpm pack 后独立安装，验证类型与 SSR，不发布 npm。

版本、不可变 CDN、OIDC 和协调部署见 [发布说明](../../docs/release.md)。
