FROM node:22-alpine AS build

WORKDIR /app

# 使用 pnpm（与项目一致）
RUN corepack enable

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
RUN cd /prod/server && pnpm exec prisma generate

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

WORKDIR /app/apps/server

EXPOSE 3000

# 启动前自动同步数据库结构（注意：生产环境建议使用 prisma migrate deploy，但需先提交 migration 文件）
CMD ["sh", "-c", "npx prisma db push && node dist/app.js"]

