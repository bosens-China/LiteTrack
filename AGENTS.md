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

### 发版流程（Changesets，禁止手动改版本号）

SDK（`@boses/litetrack-sdk`，唯一发布到 npm 的包）版本由 **Changesets** 管理，**不要手动改 `apps/sdk/package.json` 的 version**：

1. 改完 SDK，运行 `pnpm changeset`，按提示选 patch/minor/major 并写一句变更说明（生成 `.changeset/*.md`，需提交）。
   - 判断依据：JS 公共 API 破坏性变更 → major；新增功能 → minor；修复 → patch。
   - 与 API 契约版本（`API_VERSION`）无关，二者解耦。
2. 合并到 master 后，CI 自动开一个 **"Version Packages" PR**（已算好版本号、写好 CHANGELOG）。
3. **合并该 PR = 正式发版**：版本号提升落到 master，CI 的 sdk 任务才把产物写入 `apps/admin/public/sdk/<version>/`（CDN）并发布到 npm。

**已发布版本的产物不可变**：`publish.mjs` 会冻结已存在的版本目录，绝不覆盖（客户页面用固定 URL + SRI 加载，覆盖会破坏 integrity）。要发新内容必须升版本号。
