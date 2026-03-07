FROM node:22-alpine AS build

WORKDIR /app

ENV NODE_ENV=development

COPY package*.json ./
RUN npm install

COPY . .

# 构建前端静态资源
RUN npm run build


FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

# 将构建好的静态文件复制到 Nginx 默认目录
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

