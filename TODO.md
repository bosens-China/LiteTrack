# LiteTrack 开发任务清单

## 一、一期 MVP 功能进度

### ① 每篇文章总访问量（PV）
- [x] API: `POST /track` - 记录页面访问
- [x] API: `GET /stats/:siteId` - 获取页面 PV 列表
- [x] 数据库: `page_views` 表
- [x] 前端: 页面列表展示 PV 数据
- [x] SDK: `track(path)` 方法

### ② 每日访问量趋势（Daily PV）
- [x] API: `GET /stats/:siteId/trend` - 最近 30 天数据
- [x] 数据库: `daily_views` 表
- [x] 前端: ECharts 趋势图表
- [x] SDK: 自动上报当前日期

### ③ 简单去重（防止刷）
- [x] 后端: 同 IP + path + 10秒窗口限制
- [x] 存储: Redis TTL (`rate:{siteId}:{path}:{ip}`)
- [x] SDK: 无需额外处理，后端自动过滤

### ④ 热门文章排行
- [x] API: `GET /stats/:siteId/popular` - TOP 10
- [x] 排序: ORDER BY count DESC LIMIT 10
- [x] 前端: 热门页面列表展示

---

## 二、剩余待完成

### 部署相关
- [ ] 部署文档编写
- [ ] 生产环境配置
- [ ] Docker 镜像构建

### 测试相关
- [ ] SDK 单元测试
- [ ] API 集成测试
- [ ] 端到端测试

### 文档相关
- [ ] API 文档
- [ ] SDK 使用文档
- [ ] 部署指南

---

## 三、二期规划（暂不开发）

- UV 统计
- 浏览器/设备/操作系统统计
- 来源统计（Referrer）
- 地理位置统计
- 实时在线人数
- 阅读完成率
- 热力图分析
