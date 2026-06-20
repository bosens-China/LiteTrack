# AGENTS.md （AI规则指南）

- prd文档在 `docs/prd.md` 中，每次变动需求后需要更新prd文档
- 包管理工具使用 pnpm，此外这个项目是 monopore项目
- 注意区分操作系统来决定调用的命令
- 使用TS，避免出现any类型
- 使用中文回复，适当添加注释
- 使用utf-8编码
- 禁止使用 any，不知道类型可以使用 unknown
- 禁止未经允许使用 @ts-expect-error 或者 eslint的关闭检查
- 代码行数超出400行，考虑拆分文件

## 接口版本约定（重要）

后端接口按**受众**分两类，前缀与版本策略不同，新增接口前先判断归属：

- **公共契约（带版本）** `/litetrack/v1` → `apps/server/src/routes/public/`：面向 SDK，契约稳定，**只增不改**（新字段必须可选、未知字段忽略，即 tolerant reader），破坏性变更才新增 `public/v2/` 并保留 v1。
- **内部接口（不带版本）** `/litetrack/api` → `apps/server/src/routes/internal/`：面向后台前端，随前端一起部署，可自由演进。

两个版本号**刻意解耦**：SDK 的 npm 语义化版本（package.json）与 API 契约版本无关；API 契约版本由 `apps/sdk/src/core/version.ts` 的 `API_VERSION` 常量**显式声明**，禁止从 SDK 大版本号推导。详见 `docs/PRD.md` 2.1 节。

## 前端指南

每次修改完代码，使用 `pnpm type-check` 和 `pnpm lint` 检查代码

## 后端指南

每次修改代码后运行 `pnpm lint` 和 `pnpm check` 检查代码

## SDK 指南

每次修改完代码，使用 `pnpm type-check` 和 `pnpm lint` 检查代码

### 发版流程（release-please，禁止手动改版本号）

SDK（`@boses/litetrack-sdk`，唯一发布到 npm 的包）版本由 **release-please** 依据 **Conventional Commits** 自动维护，**不要手动改 `apps/sdk/package.json` 的 version**。配置在仓库根的 `release-please-config.json` 与 `.release-please-manifest.json`：

1. 改完 SDK，按 **Conventional Commits** 提交即可（无需再写 changeset）：
   - 类型决定版本：`fix:` → patch；`feat:` → minor；带 `!` 或 `BREAKING CHANGE:` → major。
   - **归属按文件路径**：release-please 只统计作用于 `apps/sdk/**` 的提交来决定 SDK 是否发版（动 server/admin 不会触发 SDK 发版）；scope 写 `(sdk)` 是习惯，真正生效的是路径。
   - 与 API 契约版本（`API_VERSION`）无关，二者解耦。
2. 推送到 master 后，release-please 自动开/更新一个 **release PR**（已算好版本号、生成 `apps/sdk/CHANGELOG.md`、bump `apps/sdk/package.json`）。
3. **合并该 PR = 正式发版**：release-please 打 git tag（`vX.Y.Z`）并建 GitHub Release，触发 CI 的 sdk 任务把产物写入 `apps/admin/public/sdk/<version>/`（CDN）并发布到 npm。

**已发布版本的产物不可变**：`publish.mjs` 会冻结已存在的版本目录，绝不覆盖；`manifest.json` 同样**只增不改**——已登记版本的 integrity/size 不重算，仅追加新版本（客户页面用固定 URL + SRI 加载，任何字节/记录变化都会破坏 integrity）。要发新内容必须升版本号。
