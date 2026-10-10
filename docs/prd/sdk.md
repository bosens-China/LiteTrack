# SDK 产品决策

## 接入与生命周期

- npm、独立 ESM 文件和 IIFE Script 共用同一核心；无运行时依赖、框架无关，不强制使用 npm。
- 后台可复制和下载 index.mjs 与配套 index.d.mts，放在同目录后本地导入；类型声明也不依赖私有契约包。接入方自行维护复制版本的升级。
- 提供可独立安装的 integrate-litetrack Agent Skill，覆盖三种接入方式与验证；后台「AI Skills」入口只复制安装命令，通过 --skill 精确选择，不批量安装仓库内部开发技能。
- create() 仅初始化，不发送事件；SSR 导入与初始化安全，浏览器显式 page() 后才采集。
- page() 默认读取 pathname/title；同实例连续同路径幂等，A → B → A 为三次，刷新或 newVisit:true 为新事件。
- 不劫持路由，不添加框架插件。实例应在应用生命周期内复用，React StrictMode 不应通过重复创建实例绕过去重。
- destroy() 幂等，之后不采集；已开始的请求允许完成或超时。当前没有长期监听器。

## 身份与错误

- 匿名身份按接入 Token 命名空间写入 localStorage。支持 Web Locks 时协调首次多标签页写入，存储失败则降级为本页面内存。
- 无 Web Locks 的环境首次多标签页初始化可能竞争；禁用存储后不保证跨标签页或刷新身份连续。跨设备不合并。
- 服务端判定会话，SDK 不发送 sessionId、客户时间、IP、UA 或自定义用户身份。
- 默认请求时限十秒，使用 fetch keepalive；失败通过 onError 报告，回调自身异常被隔离，不破坏宿主。非法初始化同步拒绝。
- 不提供自动重试、离线队列或送达保证。同路径去重针对已尝试发送的事件，不等于服务端成功。
- 移除 read、时长采样、identify/resetIdentity、公开统计查询和旧契约兼容。

## 发布

- 只有 SDK 发布至 npm；共享契约包私有，运行时需要的路径规范/协议号打入 SDK，不依赖私有包安装。
- npm 版本由 release-please 维护，不手动改 version；破坏性变更必须使用 Conventional Commit 的 ! 或 BREAKING CHANGE。
- 本次重构目标为 2.0.0，复用现有 npm 包名、GitHub Release/tag 与 OIDC 发布入口；禁止新增 1.x 发布，不把后续版本固定成 2.0.0。
- 当前协议号独立于 npm 版本；仅支持最新服务，不承诺旧接口可用。
- 固定 CDN 版本与 npm 构建必须一致，IIFE、ESM、类型声明及 source map 均校验字节大小和 SHA-384；已有版本/历史记录不可覆盖。开发预览独立于正式版本。
- 权威用法：[SDK README](../../apps/sdk/README.md)；发布门禁：[发布说明](../release.md)。
