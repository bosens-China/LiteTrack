# Plugins Folder

这里放 LiteTrack 的 Fastify 插件，负责提供跨路由共享的基础能力。

## 当前插件

- `zod.ts`
  配置 Zod validator / serializer compiler。
- `jwt.ts`
  JWT 签发与鉴权装饰器，默认读取 `JWT_EXPIRES_IN`。
- `cors.ts`
  CORS 配置。
- `sensible.ts`
  Fastify 常用 HTTP errors。
- `error-handler.ts`
  统一错误处理。
- `prisma.ts`
  Prisma Client 单例与生命周期管理。
- `redis.ts`
  Redis 客户端与限流装饰器。

## 约定

- 插件负责声明 decorator、hook 和全局基础设施。
- 路由只消费插件暴露的能力，不重复创建数据库或缓存连接。
- 新增跨领域共享能力时，优先作为插件落地，而不是散落到业务路由中。
