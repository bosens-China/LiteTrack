# AGENTS.md （AI规则指南）

- PRD 在 `docs/PRD.md` 中，实施中的需求与进度在 `docs/work/` 中维护。
- 包管理工具使用 pnpm，此外这个项目是 monopore项目
- 注意区分操作系统来决定调用的命令
- 使用TS，避免出现any类型
- 使用中文回复，适当添加注释
- 使用utf-8编码
- 禁止使用 any，不知道类型可以使用 unknown
- 禁止未经允许使用 @ts-expect-error 或者 Oxlint 的关闭检查
- 使用 Oxlint 检查代码，根配置为 `.oxlintrc.json`；不使用 ESLint。Prettier 仅负责格式化，TypeScript 类型检查独立执行。
- 代码行数超出400行，考虑拆分文件

## 接口约定

- SDK 仅使用 `/litetrack/collect`，协议标识在共享 contracts 包中独立声明，不从 npm 版本推导。
- 后台接口使用 `/litetrack/api`，与前端一起演进。
- 仅支持最新协议，不保留旧 v1 接口；历史数据不迁移。开发和测试必须使用独立新库，禁止擅自重置已有数据库。
- 统计基于页面原始事件和服务端会话，30 分钟没有页面事件则开始新会话。

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
   - **归属按文件路径**：release-please 统计 `apps/sdk/**`，包括私有共享契约 `apps/sdk/contracts`（只动 server/admin 不会触发 SDK 发版）；scope 写 `(sdk)` 是习惯，真正生效的是路径。
   - 与采集协议版本（`PROTOCOL_VERSION`）无关，二者解耦。
2. 推送到 master 后，release-please 自动开/更新一个 **release PR**（已算好版本号、生成 `apps/sdk/CHANGELOG.md`、bump `apps/sdk/package.json`）。
3. **合并该 PR = 启动正式发版**：release-please 打 git tag（`vX.Y.Z`）并建 GitHub Release，CI 的 sdk-assets 任务追加 `apps/admin/public/sdk/<version>/`，Docker 任务构建配套镜像，并通过 OIDC 发布 npm；npm 不等待生产部署。维护者更新服务器后再执行 CDN 验收。详见 `docs/release.md`。

**已发布版本的产物不可变**：`publish.mjs` 会冻结已存在的版本目录，绝不覆盖；`manifest.json` 同样**只增不改**——已登记版本的 integrity/size 不重算，仅追加新版本（客户页面用固定 URL + SRI 加载，任何字节/记录变化都会破坏 integrity）。要发新内容必须升版本号。
