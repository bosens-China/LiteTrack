FROM node:22-alpine AS build

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY . .

# 构建 TypeScript 到 dist
RUN npm run build:ts


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 仅安装生产依赖（包含 @prisma/client）
COPY package*.json ./
RUN npm install --omit=dev

# 复制构建产物和必要文件
COPY --from=build /app/dist ./dist
COPY prisma ./prisma

# 暴露应用端口（默认为 3000，可通过环境变量覆盖）
EXPOSE 3000

CMD ["node", "dist/app.js"]

