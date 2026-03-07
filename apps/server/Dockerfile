FROM node:22-alpine AS build

WORKDIR /app

# 使用 pnpm（与项目一致）
RUN corepack enable

# 仅拷贝 server 子项目，减少无关文件导致的缓存失效
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server ./apps/server

# 安装后端所需依赖并构建（需要 devDependencies 中的 typescript 等）
RUN pnpm install --filter server... --frozen-lockfile
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

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["node", "dist/app.js"]

