FROM node:22-alpine AS build

WORKDIR /app

# 使用 pnpm（与项目一致）
RUN corepack enable

# 非交互构建：让 pnpm 以 CI 模式运行（默认 frozen-lockfile、purge 不再要 TTY 确认）
ENV CI=true

# 安装 openssl (Prisma 在 Alpine 上需要)
RUN apk add --no-cache openssl

# 先拷贝工作区配置文件（这些不常变更，可充分利用缓存）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# 仅拷贝 package.json 先安装依赖（代码变更不会导致重新安装依赖）
COPY apps/server/package.json ./apps/server/

# 安装后端所需依赖（只要 package.json 不变，这层就会被缓存）
RUN pnpm install --filter server... --frozen-lockfile

# 再拷贝源码（代码变更只会影响后续层）
COPY apps/server ./apps/server

# 设置临时的 DATABASE_URL 以通过 prisma generate 的验证（不需要真实连接）
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"

RUN pnpm --filter server db:generate
RUN pnpm --filter server build:ts
RUN pnpm --filter server deploy --prod --legacy /prod/server
# 注意：用 `--dir` 让 pnpm 仍从 /app 解析版本（根 packageManager 锁定的 10.32.0），
# 仅把工作目录指到 /prod/server。若用 `cd /prod/server && pnpm`，该目录无 packageManager
# 字段，corepack 会拉 pnpm latest（11.8.0），其 exec 前置依赖校验会在无 TTY 时中止构建。
RUN pnpm --dir /prod/server exec prisma generate

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 复制最小化生产部署产物（含 prod 依赖）
COPY --from=build /prod/server ./
# deploy 会按发布文件清单拷贝，dist 可能被忽略，这里显式补齐编译产物
COPY --from=build /app/apps/server/dist ./apps/server/dist
# 显式复制 prisma 目录，确保 schema.prisma 存在，用于执行数据库迁移
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
# 显式复制 prisma.config.ts，确保 prisma db push 能读取到配置
COPY --from=build /app/apps/server/prisma.config.ts ./apps/server/prisma.config.ts

# 以非 root 用户运行，降低被攻破后的影响面（node 镜像内置 uid 1000 的 node 用户）
RUN chown -R node:node /app
USER node

WORKDIR /app/apps/server

EXPOSE 3000

# 容器内健康检查：探测不带版本的 /health 端点
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# 启动前执行数据库迁移（migrations 已纳入版本管理，使用 migrate deploy 而非 db push，避免 schema 漂移丢数据）
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]

