# LiteTrack 开发任务清单

## 一、当前已完成

### 数据采集与统计

- [x] API: `POST /track` 页面访问上报
- [x] API: `POST /track/read-progress` 阅读深度上报
- [x] API: `GET /track/stats` 公开查询站点 / 页面统计
- [x] API: `GET /track/verify` 校验 Site Token
- [x] 数据库: `page_views` / `daily_views` / `daily_visitors` / `page_daily_visitors`
- [x] 数据库: `access_logs` / `page_read_progress`
- [x] 后端: `APP_TIMEZONE` 时区归档
- [x] 后端: 同 IP + path + 10 秒窗口限流
- [x] SDK: 自动上报 PV
- [x] SDK: 自动上报阅读进度

### 管理后台能力

- [x] GitHub OAuth 登录
- [x] OAuth `state` 校验
- [x] JWT 默认 30 天有效期
- [x] 仪表盘聚合概览接口 `GET /stats/dashboard`
- [x] 页面总览 / 热门页面 / 趋势图
- [x] 页面列表检索、分页、排序
- [x] UV 趋势分析
- [x] 设备 / 浏览器 / 操作系统分布
- [x] 阅读完成率分析
- [x] 访问日志查询
- [x] Site / Site Token 管理

### 工程化

- [x] 服务端统计路由按模块拆分
- [x] SiteDetail 页面拆分 composable / modal
- [x] SDK 入口按 `core/*` 模块拆分
- [x] SDK 调用面重设计为 `create/page/read/navigate/identify/stats`
- [x] 超长文件审计与拆分收敛
- [x] 服务端基础路由测试
- [x] 服务端真实装配链路测试（`buildServer + autoload + prefix`）
- [x] SDK 单元测试
- [x] 各模块 README 更新

## 二、仍待完善

### 部署相关

- [ ] 完整部署文档编写
- [ ] 生产环境配置收敛（域名 / CORS / OAuth 回调地址 / 密钥）
- [ ] Docker 镜像构建验证
- [x] Server/Admin Dockerfile 已提供

### 测试相关

- [ ] OAuth 回调链路测试
- [ ] 站点 CRUD 与 Token 管理测试
- [ ] 上报链路更完整的集成测试
- [ ] 管理后台组件 / 页面测试
- [ ] 端到端测试

### 文档相关

- [x] API 文档（README 版）
- [x] SDK 使用文档
- [x] 模块说明文档同步
- [ ] 部署指南

## 三、后续可选增强

- [ ] 地理位置统计
- [ ] 实时在线人数
- [ ] Referrer 聚合面板
- [ ] 告警 / 异常流量识别
- [ ] 更细粒度权限与多成员协作
