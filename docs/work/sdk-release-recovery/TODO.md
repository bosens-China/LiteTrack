# SDK 2.0 发布恢复

目标：恢复已合并的 2.0.0 发布，并让镜像部署在 npm 发布之前完成。

- [x] 核对 PR #2、CI、npm 和生产静态资源；确认 Release 缺失导致发布任务跳过。
- [x] 使用 release-please 17.3.0 只读构造候选，确认 v2.0.0 对应原合并 SHA a6b23e8。
- [x] 修复后续发布 PR 分组，阻止未打 tag 的发布 PR 被静默跳过，增加已有 Release 的恢复入口。
- [ ] 完成工作流静态检查、恢复入口正反例、类型与 Lint 检查。
- [ ] 提交并推送 CI 修复；恢复原 2.0.0 Release，配置 CDN 地址和部署审批。
- [ ] 构建包含正式 SDK 的镜像；用户部署后通过 CDN 校验并发布 npm。

生产地址：https://litetrack.xiaowo.live。检查时 current.json 为 404，manifest 仅含 1.x；已有后台部署仍需补上正式 2.0 静态产物。
