FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

# 先拷贝工作区配置文件
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# 仅拷贝 package.json 先安装依赖（提升缓存复用率）
COPY apps/admin/package.json ./apps/admin/

# 安装前端依赖（缓存层）
RUN pnpm install --filter admin... --frozen-lockfile

# 再拷贝源码
COPY apps/admin ./apps/admin
RUN pnpm --filter admin build


FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# 默认后端上游地址（可在运行时通过环境变量覆盖）
ENV LITETRACK_API_UPSTREAM=server:3000

# 使用 Nginx 官方模板机制，启动时自动 envsubst
COPY apps/admin/nginx.conf /etc/nginx/templates/default.conf.template

# 将构建好的静态文件复制到 Nginx 默认目录
COPY --from=build /app/apps/admin/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

