FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# 仅拷贝 admin 子项目，避免无关目录改动触发重建
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin ./apps/admin

# 安装前端依赖并构建
RUN pnpm install --filter admin... --frozen-lockfile
RUN pnpm --filter admin build


FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# 配置 SPA 路由回退，避免刷新子路由 404
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# 将构建好的静态文件复制到 Nginx 默认目录
COPY --from=build /app/apps/admin/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

