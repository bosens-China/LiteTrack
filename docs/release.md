# SDK 与整栈发布

## 版本规则

SDK 是唯一 npm 包，版本由 release-please 按 Conventional Commits 维护，不手改 apps/sdk/package.json 的 version。fix 提升 patch，feat 提升 minor，! 或 BREAKING CHANGE 提升 major。

本轮不兼容旧 SDK，合并实现时必须使用 feat(sdk)! 或等价 BREAKING CHANGE 提交。apps/sdk/contracts 位于 SDK 包目录内，因此共享协议/类型改动也参与 release-please 的路径检测；只改 Server/Admin 不触发 SDK 发版。

当前正式 SDK 为 **2.0.0**，npm 的 `latest` 已指向该版本，附带本仓库 GitHub Actions 的 provenance。参见 [npm 包](https://www.npmjs.com/package/@boses/litetrack-sdk/v/2.0.0) 和 [发布运行](https://github.com/bosens-China/LiteTrack/actions/runs/38367043136)。

release PR 自动更新 package.json、CHANGELOG 与 .release-please-manifest.json，合并后生成 vX.Y.Z tag 和 GitHub Release。CI 阻止新的 1.x release PR 和任何 1.x 静态发布；后续按 fix/feat/破坏性提交正常升级，不永久设置 release-as。参见 [release-please 配置](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md#configfile)。

## 复用边界

- 保留 `.github/workflows/docker-and-sdk.yml` 文件名、release-please manifest 配置和 GitHub Release/tag 机制。
- npm 仍发布 `@boses/litetrack-sdk`，沿用 GitHub Actions OIDC、provenance、公共包权限，不新增 npm 写 token。
- Docker Hub 仓库、DOCKERHUB_USERNAME/DOCKERHUB_TOKEN 与 litetrack-server/litetrack-admin 构建缓存作用域沿用；Server/Admin 改为同一 SHA 协调发布。
- CI 保留验证、独立 tarball 检查和不可变静态产物保护；生产 CDN 校验作为部署后验收，不阻塞 npm 发布。
- `npm-release` 保留 npm Trusted Publisher 的 environment 身份绑定，不配置部署等待或 required reviewers；不要仅因代码重构删除或重建已有效的发布授权。

protocolVersion 独立于 npm SemVer，只接受当前值。新 SDK 不能自动修复旧站点中的旧依赖，所有接入项目需要同步更新。

## CI 顺序

1. PR 和主分支执行冻结安装、类型、Lint、生产依赖审计、真实 PostgreSQL/Redis 测试、整栈构建、npm 独立消费者和浏览器验收。
2. 只有仓库默认分支验证通过后，release-please 才创建/更新 release PR；合并后生成版本、tag 和 GitHub Release。其他分支或 tag 的手动运行只验证，不发布镜像、静态资源或 npm。
3. 使用已验证的 SDK dist 追加固定 CDN 文件、manifest 历史和 current.json，提交静态资源。
4. 同时构建、推送 Server/Admin 同一 Git SHA 的镜像；Admin 包含本次固定 SDK。
5. 通过 OIDC 发布已验证的 pnpm tarball，不等待服务器部署。
6. 维护者随后部署镜像，再读取实际 CDN 固定 URL，验证字节大小和 SHA-384 与构建一致。

部署后在当前仓库执行验收（仅使用 Node.js 内置模块，无需安装依赖）：

```sh
SDK_CDN_ORIGIN=https://litetrack.xiaowo.live node apps/sdk/scripts/verify-cdn.mjs
```

GitHub Release 创建不等于 npm/CDN 全部成功。检查 workflow 的各发布任务；失败时修复后重跑失败任务，不重新覆盖版本，也不把 npm 查询失败当作“版本不存在”。

若 Release 已存在但整个工作流需要重新启动，在默认分支手动运行 `Verify and Release` 并勾选 `publish_sdk`。恢复入口要求当前 package.json 对应的正式 Release 已存在，且 SDK 源码和锁文件与 tag 一致，再走相同的静态产物、镜像和 npm 链路。普通手动运行不会恢复 npm 发布。

release-please 使用独立的组件发布 PR，避免聚合 PR 的无组件分支无法匹配 SDK。已合并但仍有 `autorelease: pending` 的 PR 若未生成 Release，CI 必须失败，不能将跳过静态资源和 npm 误报为发布成功。

## 一次性平台配置

发布前必须检查这些平台配置：

- GitHub Actions 允许创建 PR；Docker Hub 设置 DOCKERHUB_USERNAME 与 DOCKERHUB_TOKEN。
- GitHub environment npm-release 限制为 master 分支，不设置部署等待或 required reviewers。
- 部署后验收时设置 SDK_CDN_ORIGIN 为实际生产根地址。
- npm 包的 Trusted Publisher：GitHub Actions，owner bosens-China、repo LiteTrack、workflow docker-and-sdk.yml、environment npm-release；允许 npm publish。
- 发布 runner 使用 GitHub-hosted Ubuntu、Node 24、npm 11 和 id-token:write，不传 NPM_TOKEN 或 NODE_AUTH_TOKEN。

已有包无需再次首发。恢复发布沿用已有 Trusted Publisher，不重新建立 npm token 或擅自修改 npm 网站权限。

## 不可变产物

publish.mjs 在已有固定版本字节或历史记录不一致时直接失败；不能跳过复制后继续发布不同 npm 内容。固定目录包含 litetrack.min.js、index.mjs、index.d.mts、index.mjs.map 和 index.d.mts.map，新增版本通过 files 字段记录每个文件的 URL、大小与 SHA-384，部署后验收逐一验证。manifest 的历史 versions 记录原样保留，只追加；current.json 是唯一当前版本指针，不维护多 major 渠道。不能给已发布版本补写类型文件或改元数据，必须发新版本。

整个 `apps/admin/public/sdk/` 生成目录由 Prettier 忽略；CI 在静态资源提交后再次执行不可变校验，防止提交钩子改动字节。2.0.0 首次静态提交中的 `.mjs` 和 `.mts` 曾被钩子格式化，在 npm/CDN 正式发布前按原 CI 产物恢复至已登记 SRI 的字节，历史 integrity/size 保持不变。

开发用 publish.mjs --preview 写入 /sdk/preview，既不改历史 manifest，也不占用正式版本。预览文件禁止长期缓存；正式固定文件启用 immutable 和跨域 SRI 所需 CORS。Nginx 为 mjs 显式配置 JavaScript MIME，mts 按纯文本提供，避免浏览器模块加载被拒绝；参见 [Nginx types](https://nginx.org/en/docs/http/ngx_http_core_module.html#types)。

Admin 镜像固定 Nginx 1.29.8，使用 add_header_inherit merge，避免路径级 Cache-Control 覆盖上层防嵌入、MIME 和 Referrer 安全头。自备 Nginx 至少需要 1.29.3；参见 [Nginx 头部继承规则](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header_inherit)。

根 build 只准备预览，不覆盖任何正式版本。新正式版本必须由 release-please 产生。

## 切换与恢复

先建立新库、备份配置并部署配套 Server/Admin，再更新个人项目 SDK。不要把新基线 migrate deploy 到旧库，也不要删除旧卷来碰运气。升级期间旧 SDK 无法采集，可能漏报，这是当前允许的破坏性边界。

生产入口使用 HTTPS，PUBLIC_URL 和 GitHub callback 一致。正式切换前验证登录、建站、Token、采集与统计；保留旧部署和旧卷作为运维恢复材料，而非新版兼容方案。

## 文档依据

- [release-please 路径归属实现](https://github.com/googleapis/release-please/blob/main/src/util/commit-split.ts)
- [pnpm 10 deploy](https://pnpm.io/10.x/cli/deploy)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [Rsbuild React Compiler](https://rsbuild.rs/guide/framework/react#react-compiler)
- [Hono Node adapter](https://hono.dev/docs/getting-started/nodejs)
- [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)

已通过 Loci 核对与当前版本相关的能力，并以本地类型、构建及实际测试验证；文档不是对生产配置或容量的保证。
