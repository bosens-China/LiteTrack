FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# 拷贝整个 monorepo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps

# 安装前端依赖并构建
RUN pnpm install --filter admin... --frozen-lockfile
RUN pnpm --filter admin build


FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# 将构建好的静态文件复制到 Nginx 默认目录
COPY --from=build /app/apps/admin/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

