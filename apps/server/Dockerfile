FROM node:22-alpine

WORKDIR /app

# 使用 pnpm（与项目一致）
RUN corepack enable

# 拷贝整个 monorepo（便于使用 pnpm workspace）
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps

# 安装后端所需依赖并构建（需要 devDependencies 中的 typescript 等）
RUN pnpm install --filter server... --frozen-lockfile
RUN pnpm --filter server build:ts

ENV NODE_ENV=production

WORKDIR /app/apps/server

EXPOSE 3000

CMD ["node", "dist/app.js"]

