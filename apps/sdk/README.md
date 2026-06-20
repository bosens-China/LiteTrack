# LiteTrack SDK

面向浏览器环境的轻量统计 SDK，当前调用面围绕 `create()` 展开。

## 设计目标

- 默认调用简单
- 对 SPA 友好
- 不默认把数据发到官方域名
- 提供最小可诊断能力

## 快速开始

```ts
const tracker = LiteTrack.create({
  siteToken: 'st_xxx',
  baseUrl: 'https://your-api.com',
  autoPageview: true,
  autoReadProgress: true,
});
```

`baseUrl` 必填，只需填服务器源（如 `https://your-api.com`），**不要**带 `/litetrack/v1` 前缀。SDK 会自动拼接 API 契约前缀。注意：API 契约版本与 SDK 语义化版本**刻意解耦**——契约前缀由源码 `src/core/version.ts` 的 `API_VERSION` 常量显式声明（当前为 `v1`），**不随 SDK 大版本号变化**。只有后端上报协议发生破坏性变更时才会手动迁移到 `v2`。SDK 不再内置默认线上地址。

## 浏览器 script 引入

```html
<script src="/js/litetrack.js" defer></script>
<script>
  window.addEventListener('load', function () {
    window.LiteTrack.create({
      siteToken: 'st_xxx',
      baseUrl: 'https://your-api.com',
      autoPageview: true,
      autoReadProgress: true,
    });
  });
</script>
```

## API

### `LiteTrack.create(options)`

```ts
const tracker = LiteTrack.create({
  siteToken: 'st_xxx',
  baseUrl: 'https://your-api.com',
  autoPageview: true,
  autoReadProgress: true,
  readProgressMilestones: [25, 50, 75, 100],
  identity: {
    visitorId: 'visitor_123',
    sessionId: 'session_456',
  },
  debug: false,
  onError(error) {
    console.error('[LiteTrack]', error);
  },
});
```

参数说明：

| 参数                     | 说明                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `siteToken`              | 站点令牌，必填                                                                      |
| `baseUrl`                | API 服务器源，必填，例如 `https://your-api.com`（不带版本前缀，SDK 自动按版本拼接） |
| `autoPageview`           | 默认 `true`，创建后自动上报首屏 PV                                                  |
| `autoReadProgress`       | 默认 `false`，自动监听滚动与离开事件                                                |
| `readProgressMilestones` | 阅读深度里程碑，默认 `[25, 50, 75, 100]`                                            |
| `identity`               | 可选，外部传入 `visitorId` / `sessionId`                                            |
| `debug`                  | 默认 `false`，开启后会把 SDK 错误输出到控制台                                       |
| `onError`                | SDK 内部请求失败时的回调                                                            |

## Tracker 方法

### `tracker.page(input?)`

```ts
tracker.page();

tracker.page({
  path: '/posts/hello',
  title: 'Hello World',
});
```

### `tracker.read(input)`

```ts
tracker.read(80);

tracker.read({
  path: '/posts/hello',
  percent: 80,
});
```

### `tracker.navigate(input)`

用于 SPA 路由切换。

```ts
tracker.navigate({
  path: '/posts/hello',
  title: 'Hello World',
});
```

也可以精细控制：

```ts
tracker.navigate({
  path: '/posts/hello',
  title: 'Hello World',
  trackPageview: true,
  resetReadProgress: true,
});
```

### `tracker.identify(identity)`

```ts
tracker.identify({
  visitorId: 'visitor_123',
  sessionId: 'session_456',
});
```

### `tracker.stats.site()`

```ts
const siteStats = await tracker.stats.site();
```

返回：

```ts
{
  totalViews: number;
  totalPages: number;
}
```

### `tracker.stats.page(path)`

```ts
const pageStats = await tracker.stats.page('/posts/hello');
```

返回：

```ts
{
  path: string;
  count: number;
}
```

### `tracker.destroy()`

```ts
tracker.destroy();
```

## 默认请求路径

SDK 会基于 `baseUrl` 加上 API 契约前缀 `/litetrack/${API_VERSION}`（由 `src/core/version.ts` 显式声明，当前 `v1`，与 SDK 大版本号无关）拼出以下接口：

- 页面访问上报：`${baseUrl}/litetrack/v1/track`
- 阅读深度上报：`${baseUrl}/litetrack/v1/track/read-progress`
- 公开统计查询：`${baseUrl}/litetrack/v1/track/stats`

所有请求都会带 `X-LiteTrack-SDK: <版本号>` 请求头，便于后端统计各 SDK 版本使用情况。

## 错误处理

- `page()` / `read()` / 自动上报属于 fire-and-forget，不会向外抛异常
- 这些异常会进入 `onError`
- `tracker.stats.site()` / `tracker.stats.page()` 失败时会 reject，同时也会触发 `onError`

## 身份策略

- 默认优先使用浏览器 `localStorage` / `sessionStorage`
- 如果存储不可用，会自动退化到内存身份，不会让阅读进度直接失效

## 构建与检查

```bash
cd apps/sdk

pnpm build
pnpm type-check
pnpm lint
pnpm test
```

## 许可证

MIT
