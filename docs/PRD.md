# LiteTrack 产品决策

## 产品范围

LiteTrack 面向个人开发者的多个网站，提供自托管访问统计。重点是了解访问规模、变化、热门页面与入口来源；不建设通用埋点分析平台。

当前保留：GitHub 登录、项目管理、项目 API Key、PV、UV、Visits、PV/UV 趋势、热门页面 PV/UV、来源域名 Visits。

一个项目对应一个网站域名，创建时自动生成一个默认采集 API Key；沿用 Site、SiteToken 数据模型和 `/sites` 内部接口，不额外引入项目层级。SDK 的 siteToken 参数与 X-Site-Token 请求头承载该 API Key。

不提供阅读深度、停留时长、跳出率、地域、设备分类、UTM 营销归因、访问日志浏览、SDK 历史管理页面、热力图、漏斗、画像、实时在线、团队权限或消息队列。

## 技术与数据边界

- 后台使用 React + Ant Design 默认主题，仅配置中文 locale，不覆盖主题 Token；Rsbuild 启用 React Compiler，React Router 管理路由，React Query 管理服务端状态，ECharts 绘制趋势。
- 后端使用 Hono + Node.js；PostgreSQL + Prisma 保存事实，Redis 仅承担限流和 OAuth 短期状态。
- pnpm monorepo，TypeScript；SDK 使用 tsdown，提供 npm、独立 ESM JS + 类型文件、IIFE Script 三种接入方式，共用核心，不强制依赖 npm 包。
- 统一使用 Oxlint 检查代码，不使用 ESLint；Prettier 负责格式化，tsc 负责独立类型检查。
- PostgreSQL 沿用既有部署能力，支持事务、唯一约束和分析查询；当前负载不需要独立分析数据库或同步聚合表。
- 共享契约位于 apps/sdk/contracts，保持私有 workspace 包；协议改动归入 SDK 的 release-please 路径，不能漏发包。

## 指标口径

| 指标     | 当前定义                                                                               |
| -------- | -------------------------------------------------------------------------------------- |
| 页面事件 | 实际页面打开或已完成的路由切换，具有唯一 eventId                                       |
| PV       | 查询范围内成功提交的页面事件数；同 eventId 重放不增加                                  |
| UV       | 同站点、查询范围内 visitorId 去重；不累加每日 UV                                       |
| Visits   | 范围内开始的会话数；距上次页面事件达到 30 分钟则下一事件开启新会话                     |
| 趋势     | 每日 PV/UV，空日期补零                                                                 |
| 热门页面 | 相同日期范围按规范化路径聚合 PV/UV，PV 降序并稳定排序                                  |
| 来源     | 会话首次页面事件的外部来源域名，按会话开始时间统计 Visits；同站点、无效或缺失为 direct |

时间由服务端赋 UTC 值，按 Asia/Shanghai 划分统计日；日期含首尾日，内部查询左闭右开，最长 366 天。会话跨零点不强制拆分，因此某日可有 PV 而无新 Visit。长时间停留同页不发送心跳，也不假定持续活跃。

路径去掉 query/hash 和尾斜线，不合并大小写；逻辑路径或 Hash 路由由接入方显式提供。来源来自页面 document.referrer，只持久化规范化域名，不用采集请求的 Referer 代替导航来源。

## 一致性与隐私

- 六个模型：User、Site、SiteToken、Visitor、Session、PageviewEvent。事件与会话均受站点约束。
- 会话创建/续接、访客状态与事件写入在同一事务中完成；同访客并发串行化，同 eventId 去重。成功代表提交完成，依赖故障不能返回成功。
- 原始事件和会话为事实来源，不维护同步计数表；当前无自动保留期或静默清理。未来聚合必须可重建。
- 默认不保存原始 IP、UA、语言、UTM 和完整来源 URL；IP 仅用于入口限流。反向代理日志需部署方管理保留期。
- UV 是匿名浏览器估计值，不代表真实自然人。清理存储、不同设备/浏览器、Token 轮换或存储被禁用均可重新计数。
- 公开站点 Token 与 Origin 校验不能保证数据来源真实性。

## 管理后台

- 后台使用 Ant Design 默认主题与 Layout/Menu/Breadcrumb/Card/Statistic，图标统一使用 @ant-design/icons，品牌标识与默认主色同属蓝色系；桌面侧栏、窄屏抽屉导航。一级菜单为数据总览、项目管理、接入指南；项目管理固定提供项目列表与项目设置二级入口。二级菜单根据路由选中，深链与刷新自动展开父菜单，窄屏展开父菜单保持抽屉，点击叶子入口后关闭。
- 数据总览支持全部项目与单个项目切换。全局按日期提供项目数、PV、项目区间 UV 合计、Visits、每日趋势、项目访问排行和前 20 项来源分布；单项目提供 PV/UV/Visits、趋势、热门页面和来源。只展示当前用户项目，UV 合计不代表跨项目去重人数。
- 项目选择、日期及分页进入 URL，改日期保留项目，切项目重置热门页面分页，刷新与浏览器历史恢复相应状态；非法或无权限项目明确报错，不默默切成全局或其他项目。旧项目统计地址跳转到统一总览并保留筛选。
- 项目列表展示当日指标，分页保存到 URL，提供访问统计与项目设置入口；新建成功弹窗显示默认 Key，支持复制和直接前往对应项目的接入指南。项目设置入口可选择和切换项目。
- 数据总览的全局与单项目统一支持今日、近 7 天、30 天与自定义日期。
- 每个区域处理加载、空数据和失败；旧请求取消或按查询键隔离，不覆盖新范围。
- 设置页支持项目编辑、API Key 文本查看/复制/停用/删除；正常接入无需单独创建 Key，仅在没有可用 Key 时提供生成入口，保留历史 Key。仅登录后的项目所有者可取回，响应禁止缓存；Key 只用于公开采集，不授予后台管理权限。删除项目必须确认永久级联删除的影响。
- SDK、Skills 与接入说明统一位于接入指南，项目设置仅保留资料、Key 和删除操作。未选项目也可查看公共内容，选择项目后填充启用的 Key；无可用 Key 时引导前往该项目设置，切换项目不残留上一项目 Key。
- SDK 接入代码高亮并可复制；npm Registry 发布状态与当前构建的兼容发布状态分别展示，只有当前正式 SDK 确实存在于 Registry 时提供固定版本安装命令。状态查询失败支持重试。
- 接入指南提供当前构建的 index.mjs 与 index.d.mts 全文复制、下载及接入代码；优先展示文件操作与接入示例，文件源码默认折叠。二者同目录即可通过本地 ESM 导入，不需要 npm 安装。Script 与 npm 入口保留；复制的本地文件由接入方自行升级。
- Script 旁提供「AI Skills」标签，显示并可复制指定技能的 npx skills 安装命令，不在浏览器执行命令。公开接入技能位于 skills/integrate-litetrack，指导外部 Agent 完成 SDK/Script 接入、路由上报和验证，不包含用户 Key 或管理凭据。
- GitHub OAuth state 绑定浏览器且一次核销；登录态使用 HttpOnly Cookie，不向前端暴露 JWT。

## 版本与部署

仅维护新版 `/litetrack/collect` 与后台 `/litetrack/api`，不保留 v1/v2 并存兼容层。protocolVersion 独立于 npm SemVer，当前只接受一个值。

本次重构不迁移旧统计数据，使用新数据库和迁移基线；不执行生产清库。未来升级继续使用增量迁移与备份，不延续“每次重构清库”的策略。

SDK、Server、Admin 需要协调部署；旧 npm SDK 不会自动升级，破坏性切换可能漏报。正式发布版本不可覆盖，静态历史产物保留不等于服务端兼容。

本轮 SDK 从 1.1.1 升级到 2.0.0，继续使用既有 release-please、GitHub Release/tag、npm OIDC 与 Docker Hub 发布流程。版本和 CHANGELOG 由 release PR 自动维护，不手改版本，不覆盖旧包；CI 拒绝把重构发成新的 1.x。后续恢复正常 SemVer 演进。

## 权威入口

- [SDK 产品决策](./prd/sdk.md)
- [SDK 接入与行为](../apps/sdk/README.md)
- [Server 配置、接口与运维](../apps/server/README.md)
- [后台开发](../apps/admin/README.md)
- [发布流程](./release.md)
