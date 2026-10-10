FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
ENV CI=true
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin/package.json ./apps/admin/
COPY apps/sdk/package.json ./apps/sdk/
COPY apps/sdk/contracts/package.json ./apps/sdk/contracts/
RUN pnpm install --filter admin... --filter @boses/litetrack-sdk... --frozen-lockfile
COPY apps/sdk ./apps/sdk
COPY apps/admin ./apps/admin
RUN pnpm --filter @litetrack/contracts build && pnpm --filter @boses/litetrack-sdk build
RUN node apps/sdk/scripts/publish.mjs --preview && pnpm --filter admin build

FROM nginx:1.29.8-alpine AS runner
WORKDIR /usr/share/nginx/html
ENV LITETRACK_API_UPSTREAM=server:3000
COPY apps/admin/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/admin/dist ./
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

