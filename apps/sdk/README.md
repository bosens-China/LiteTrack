# LiteTrack SDK

轻量级、框架无关的网站访问统计 SDK

## 特性

- 🪶 **轻量级**：不到 2KB（gzip）
- 🔌 **框架无关**：适用于 React、Vue、Angular、Svelte 等任何框架
- 🚀 **高性能**：使用 `sendBeacon` API，不阻塞页面卸载
- 📡 **自动追踪**：可选的自动路由监听
- 🛠️ **可扩展**：提供基础 API，开发者可自由适配

## 安装

```bash
npm install litetrack-sdk
# 或
pnpm add litetrack-sdk
# 或
yarn add litetrack-sdk
```

## 快速开始

### 基础用法

```typescript
import { init, track } from 'litetrack-sdk'

// 初始化（在应用启动时调用一次）
init({
  token: 'your-site-token', // 从 LiteTrack 后台获取
})

// 手动上报页面访问
track('/blog/hello-world')
```

### 自动追踪（推荐）

```typescript
import { init, autoTrack } from 'litetrack-sdk'

init({ token: 'your-site-token' })

// 自动监听浏览器路由变化并上报
autoTrack()
```

## API 参考

### `init(options)`

初始化 SDK

```typescript
interface LiteTrackOptions {
  token: string      // 必填，网站访问令牌
  apiUrl?: string    // 可选，API 地址
  debug?: boolean    // 可选，开启调试日志
}

init({
  token: 'your-token',
  debug: process.env.NODE_ENV === 'development',
})
```

### `track(path)`

手动上报页面访问

```typescript
track('/blog/hello-world')
```

### `autoTrack(getPath?)`

自动追踪页面访问

```typescript
// 默认使用 location.pathname
autoTrack()

// 自定义路径（适用于 hash 路由）
autoTrack(() => window.location.hash.slice(1) || '/')
```

## 框架适配示例

### React

```tsx
// hooks/useLiteTrack.ts
import { useEffect } from 'react'
import { init, track } from 'litetrack-sdk'
import { useLocation } from 'react-router-dom'

export function useLiteTrack(token: string) {
  const location = useLocation()

  useEffect(() => {
    init({ token })
  }, [token])

  useEffect(() => {
    track(location.pathname + location.search)
  }, [location])
}

// App.tsx
function App() {
  useLiteTrack('your-token')
  return <div>...</div>
}
```

### Vue 3

```typescript
// composables/useLiteTrack.ts
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { init, track } from 'litetrack-sdk'

export function useLiteTrack(token: string) {
  const route = useRoute()

  init({ token })

  watch(
    () => route.path,
    (path) => {
      track(path)
    },
    { immediate: true }
  )
}

// App.vue
<script setup>
useLiteTrack('your-token')
</script>
```

### Vue 2

```javascript
// main.js
import { init, autoTrack } from 'litetrack-sdk'

init({ token: 'your-token' })

// Vue Router 导航守卫
router.afterEach((to) => {
  track(to.path)
})
```

### Next.js

```tsx
// components/LiteTrack.tsx
'use client'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { init, track } from 'litetrack-sdk'

export function LiteTrack({ token }: { token: string }) {
  const pathname = usePathname()

  useEffect(() => {
    init({ token })
  }, [token])

  useEffect(() => {
    if (pathname) {
      track(pathname)
    }
  }, [pathname])

  return null
}

// layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <LiteTrack token="your-token" />
        {children}
      </body>
    </html>
  )
}
```

### Nuxt 3

```typescript
// plugins/litetrack.client.ts
import { init, track } from 'litetrack-sdk'

export default defineNuxtPlugin(() => {
  const route = useRoute()
  
  init({ token: 'your-token' })

  watch(
    () => route.path,
    (path) => {
      track(path)
    },
    { immediate: true }
  )
})
```

### SvelteKit

```typescript
// hooks.client.ts
import { init, track } from 'litetrack-sdk'
import { page } from '$app/stores'

init({ token: 'your-token' })

page.subscribe(($page) => {
  track($page.url.pathname)
})
```

### 原生 JavaScript (CDN)

```html
<script type="module">
  import { init, track } from 'https://unpkg.com/litetrack-sdk/dist/index.mjs'
  
  init({ token: 'your-token' })
  track('/')
</script>
```

## 调试

开启调试模式查看日志：

```typescript
init({
  token: 'your-token',
  debug: true,
})
```

## 许可证

MIT
