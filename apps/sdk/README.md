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
  baseUrl: 'https://your-api.com/litetrack/v1',
  autoPageview: true,
  autoReadProgress: true,
});
```

`baseUrl` 必填，SDK 不再内置默认线上地址。

## 浏览器 script 引入

```html
<script src="/js/litetrack.js" defer></script>
<script>
  window.addEventListener('load', function () {
    window.LiteTrack.create({
      siteToken: 'st_xxx',
      baseUrl: 'https://your-api.com/litetrack/v1',
      autoPageview: true,
      autoReadProgress: true
    })
  })
</script>
```

## API

### `LiteTrack.create(options)`

```ts
const tracker = LiteTrack.create({
  siteToken: 'st_xxx',
  baseUrl: 'https://your-api.com/litetrack/v1',
  autoPageview: true,
  autoReadProgress: true,
  readProgressMilestones: [25, 50, 75, 100],
  identity: {
    visitorId: 'visitor_123',
    sessionId: 'session_456',
  },
  debug: false,
  onError(error) {
    console.error('[LiteTrack]', error)
  },
})
```

参数说明：

| 参数 | 说明 |
| ---- | ---- |
| `siteToken` | 站点令牌，必填 |
| `baseUrl` | API 基础地址，必填，例如 `https://your-api.com/litetrack/v1` |
| `autoPageview` | 默认 `true`，创建后自动上报首屏 PV |
| `autoReadProgress` | 默认 `false`，自动监听滚动与离开事件 |
| `readProgressMilestones` | 阅读深度里程碑，默认 `[25, 50, 75, 100]` |
| `identity` | 可选，外部传入 `visitorId` / `sessionId` |
| `debug` | 默认 `false`，开启后会把 SDK 错误输出到控制台 |
| `onError` | SDK 内部请求失败时的回调 |

## Tracker 方法

### `tracker.page(input?)`

```ts
tracker.page()

tracker.page({
  path: '/posts/hello',
  title: 'Hello World',
})
```

### `tracker.read(input)`

```ts
tracker.read(80)

tracker.read({
  path: '/posts/hello',
  percent: 80,
})
```

### `tracker.navigate(input)`

用于 SPA 路由切换。

```ts
tracker.navigate({
  path: '/posts/hello',
  title: 'Hello World',
})
```

也可以精细控制：

```ts
tracker.navigate({
  path: '/posts/hello',
  title: 'Hello World',
  trackPageview: true,
  resetReadProgress: true,
})
```

### `tracker.identify(identity)`

```ts
tracker.identify({
  visitorId: 'visitor_123',
  sessionId: 'session_456',
})
```

### `tracker.stats.site()`

```ts
const siteStats = await tracker.stats.site()
```

返回：

```ts
{
  totalViews: number
  totalPages: number
}
```

### `tracker.stats.page(path)`

```ts
const pageStats = await tracker.stats.page('/posts/hello')
```

返回：

```ts
{
  path: string
  count: number
}
```

### `tracker.destroy()`

```ts
tracker.destroy()
```

## 默认请求路径

SDK 会基于你传入的 `baseUrl` 拼出以下接口：

- 页面访问上报：`${baseUrl}/track`
- 阅读深度上报：`${baseUrl}/track/read-progress`
- 公开统计查询：`${baseUrl}/track/stats`

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
