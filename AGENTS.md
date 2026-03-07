# AGENTS.md （AI规则指南）

- 包管理工具使用 pnpm，此外这个项目是 monopore项目
- 注意区分操作系统来决定调用的命令
- 使用TS，避免出现any类型
- 使用中文回复，适当添加注释
- 使用utf-8编码
- 禁止使用 any，不知道类型可以使用 unknown
- 禁止未经允许使用 @ts-expect-error 或者 eslint的关闭检查

## 前端指南

每次修改完代码，使用 `pnpm type-check` 和 `pnpm lint` 检查代码

## 后端指南

每次修改代码后运行 `pnpm lint` 和 `pnpm check` 检查代码

## SDK 指南

每次修改完代码，使用 `pnpm type-check` 和 `pnpm lint` 检查代码
