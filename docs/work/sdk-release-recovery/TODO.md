# SDK 2.0 发布恢复

目标：恢复已合并的 2.0.0 发布；CI 发布 npm 并构建镜像，维护者随后部署服务器并验收 CDN。

- [x] 核对 PR #2、CI、npm 和生产静态资源；确认 Release 缺失导致发布任务跳过。
- [x] 使用 release-please 17.3.0 只读构造候选，确认 v2.0.0 对应原合并 SHA a6b23e8。
- [x] 修复后续发布 PR 分组，阻止未打 tag 的发布 PR 被静默跳过，增加已有 Release 的恢复入口。
- [x] 完成 actionlint、恢复入口 8 个模拟正反例、2 个真实 Git 浅克隆检查、类型与 Lint 检查；PR 和恢复流水线完整验收通过。
- [x] 用 release-please 恢复原 v2.0.0 Release；保留 npm-release 的 OIDC 身份和 master 分支限制。
- [x] 合入 CI 修复 PR #3、tag 拉取参数修复 PR #4，并启动恢复流水线。
- [x] 追加 2.0.0 正式静态资源，保留所有 1.x 历史记录；构建并推送 Server/Admin 镜像。
- [x] 用户确认 npm 不等待部署；移除生产 CDN 门禁和环境审批，保留部署后验收脚本。
- [ ] 合入发布顺序调整，重新执行 npm 发布。
- [ ] 确认 registry 的 2.0.0 版本、latest 标签和 provenance；完成文档收口。

生产地址：https://litetrack.xiaowo.live。检查时 current.json 为 404，manifest 仅含 1.x；已有后台部署仍需补上正式 2.0 静态产物。

已构建镜像：`boses/litetrack-server:59fff13dc1a192832d180f5a491dac03d9fe073b`、`boses/litetrack-admin:59fff13dc1a192832d180f5a491dac03d9fe073b`。旧审批流水线已取消，将按无部署等待的流程重新发布。npm Trusted Publisher 的只读核查因本机未登录而不可用，保留既有授权，实际 OIDC 结果仍待发布任务验证。
