FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && apk add --no-cache openssl
ENV CI=true
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json ./apps/server/
COPY apps/sdk/contracts/package.json ./apps/sdk/contracts/
RUN pnpm install --filter server... --frozen-lockfile
COPY apps/sdk/contracts ./apps/sdk/contracts
COPY apps/server ./apps/server
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter @litetrack/contracts build && pnpm --filter server db:generate && pnpm --filter server build
RUN pnpm --filter server deploy --prod --legacy /prod/server
RUN pnpm --dir /prod/server exec prisma generate

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build --chown=node:node /prod/server ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node dist/app.js"]

