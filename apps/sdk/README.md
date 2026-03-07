# LiteTrack SDK

轻量级、框架无关的网站访问统计，仅提供一个 JS 文件，通过 script 标签引入使用。

## 使用方式

1. 获取 `dist/index.iife.js`（可重命名为 `litetrack.js`），放到你的静态资源目录。
2. 在页面中引入，在合适的时机调用上报与查询方法。

```html
<script src="/js/litetrack.js" defer></script>
<script>
  // 上报当前页面访问
  window.addEventListener('load', function () {
    LiteTrack.track('your-site-token', location.pathname)
  })

  // 查询站点汇总
  LiteTrack.getSiteStats('your-site-token').then(function (stats) {
    if (!stats) return
    console.log('total views:', stats.totalViews)
    console.log('total pages:', stats.totalPages)
  })

  // 查询当前页面访问量
  LiteTrack.getPageStats('your-site-token', location.pathname).then(function (page) {
    if (!page) return
    console.log('current page views:', page.count)
  })
</script>
```

## API

### 上报

`LiteTrack.track(token, path, apiUrl?)`

| 参数    | 说明 |
|---------|------|
| token   | 网站令牌，从 LiteTrack 后台获取 |
| path    | 页面路径，如 `/blog/hello-world` |
| apiUrl  | 可选，自定义上报地址，默认为官方上报接口 |

说明：仅发送请求，不关心返回值；网络错误会被内部捕获，不会抛异常。

### 查询站点汇总

`LiteTrack.getSiteStats(token, apiUrl?) -> Promise<{ totalViews: number; totalPages: number } \| null>`

| 参数    | 说明 |
|---------|------|
| token   | 网站令牌，从 LiteTrack 后台获取 |
| apiUrl  | 可选，自定义查询地址，默认为官方 `/track/stats` 接口 |

返回值：

- 成功：`{ totalViews, totalPages }`
  - `totalViews`：站点所有页面的累计访问次数（PV 总和）
  - `totalPages`：至少被访问过一次的不同页面数量
- 失败（网络错误、token 无效等）：`null`

### 查询指定页面

`LiteTrack.getPageStats(token, path, apiUrl?) -> Promise<{ path: string; count: number } \| null>`

| 参数    | 说明 |
|---------|------|
| token   | 网站令牌，从 LiteTrack 后台获取 |
| path    | 页面路径，如 `/blog/hello-world` |
| apiUrl  | 可选，自定义查询地址（基础地址，不含 query），默认为官方 `/track/stats` 接口 |

返回值：

- 成功：`{ path, count }`
  - `path`：实际返回的页面路径（默认等于传入的 `path`）
  - `count`：该页面的累计访问次数
- 失败（网络错误、token 无效等）：`null`

## 避免影响首屏加载

- 使用 `defer` 或把 script 放在 `</body>` 前，不要用阻塞解析的同步脚本。
- 在 `load` 或 `DOMContentLoaded` 之后再调用 `LiteTrack.track` / 查询方法；需要时可用 `setTimeout(fn, 0)` 或 `requestIdleCallback` 延后执行。

## 构建

在仓库中执行 `pnpm build`，产物为 **`dist/index.iife.js`**，仅此一个文件。

## 许可证

MIT
