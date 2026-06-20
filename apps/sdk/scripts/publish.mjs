/**
 * SDK 发布脚本
 *
 * 用途：把构建好的 IIFE 复制到 admin 静态目录（带 SRI 的版本化 CDN），更新版本清单。
 * 运行：node apps/sdk/scripts/publish.mjs
 *
 * 版本号由 Changesets 管理，**不要手动改**（见 PRD 2.2）。正常流程由 CI 驱动：
 *   1. 开发时 `pnpm changeset` 声明 patch/minor/major
 *   2. 合并 master → CI 开 "Version Packages" PR 提升版本号
 *   3. 合并该 PR → CI 构建并运行本脚本写入 CDN，再发布 npm
 *
 * 不可变保护：已存在的版本目录会被冻结跳过，绝不覆盖（见下方 main 中的守卫）。
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

const SRC_FILE = resolve(ROOT, 'apps/sdk/dist/index.iife.js');
const SDK_PUBLIC_DIR = resolve(ROOT, 'apps/admin/public/sdk');
const MANIFEST_FILE = resolve(SDK_PUBLIC_DIR, 'manifest.json');

/** 读取 package.json 拿版本 */
async function getSdkVersion() {
  const pkg = JSON.parse(
    await readFile(resolve(ROOT, 'apps/sdk/package.json'), 'utf8'),
  );
  return pkg.version;
}

/**
 * 读取 SDK 源码声明的 API 契约版本（src/core/version.ts 的 API_VERSION）。
 * 契约版本与 SDK 语义化版本解耦，不能再从大版本号推导，故以源码常量为准。
 */
async function getCurrentApiVersion() {
  const src = await readFile(
    resolve(ROOT, 'apps/sdk/src/core/version.ts'),
    'utf8',
  );
  const matched = src.match(/API_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return matched ? matched[1] : 'v1';
}

/** 计算 sha384 base64（SRI 用）和字节数 */
function computeIntegrity(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha384');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(`sha384-${hash.digest('base64')}`));
    stream.on('error', reject);
  });
}

async function getFileSize(filePath) {
  const buf = await readFile(filePath);
  return buf.length;
}

/** 读取已存在的 manifest，不存在则返回空骨架 */
async function readManifest() {
  if (!existsSync(MANIFEST_FILE)) {
    return { channels: {}, versions: [] };
  }
  return JSON.parse(await readFile(MANIFEST_FILE, 'utf8'));
}

/**
 * 扫描 sdk/ 子目录重建 versions 数组，保证 manifest 与文件系统一致。
 * 目录名必须是合法 semver（x.y.z）。
 *
 * @param {string} currentVersion 本次发布的 SDK 版本（取当前 API_VERSION）
 * @param {string} currentApiVersion 当前源码声明的 API 契约版本
 * @param {Array<{version:string, apiVersion:string}>} prevVersions 旧 manifest 记录
 */
async function scanVersions(currentVersion, currentApiVersion, prevVersions) {
  // 历史版本的 apiVersion 沿用旧 manifest：破坏性迁移后，老 SDK 仍指向旧契约
  const prevApiMap = new Map(
    prevVersions.map((v) => [v.version, v.apiVersion]),
  );
  const entries = await readdir(SDK_PUBLIC_DIR, { withFileTypes: true });
  const versionDirs = entries
    .filter((e) => e.isDirectory() && /^\d+\.\d+\.\d+/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return (pb[i] ?? 0) - (pa[i] ?? 0); // 降序
      }
      return 0;
    });

  const versions = [];
  for (const ver of versionDirs) {
    const file = resolve(SDK_PUBLIC_DIR, ver, 'litetrack.min.js');
    if (!existsSync(file)) continue;

    const integrity = await computeIntegrity(file);
    const size = await getFileSize(file);

    // 正在发布的版本采用当前契约版本；历史版本沿用旧记录，无记录则回退当前
    const apiVersion =
      ver === currentVersion
        ? currentApiVersion
        : (prevApiMap.get(ver) ?? currentApiVersion);

    versions.push({
      version: ver,
      apiVersion,
      url: `/sdk/${ver}/litetrack.min.js`,
      integrity,
      size,
    });
  }
  return versions;
}

/** 从 versions 列表推导 channels（每个大版本取最新） */
function buildChannels(versions) {
  const channels = {};
  for (const v of versions) {
    const major = v.version.split('.')[0] ?? '1';
    const key = `v${major}`;
    // versions 已降序，第一次出现的就是该大版本最新
    if (!channels[key]) {
      channels[key] = { latest: v.version, url: v.url };
    }
  }
  return channels;
}

async function main() {
  const version = await getSdkVersion();
  const destDir = resolve(SDK_PUBLIC_DIR, version);
  const destFile = resolve(destDir, 'litetrack.min.js');

  if (!existsSync(SRC_FILE)) {
    console.error(`❌ 未找到构建产物：${SRC_FILE}`);
    console.error('   请先执行：pnpm -C apps/sdk build');
    process.exit(1);
  }

  // 不可变保护：已发布版本的产物一律冻结，绝不覆盖。
  // 客户页面以固定 URL + SRI integrity 加载，覆盖会改变字节、令 integrity 失配，
  // 导致在野的该版本脚本被浏览器拒绝执行。要发布新内容必须先升版本号（走 changeset）。
  if (existsSync(destFile)) {
    console.log(
      `ℹ 版本 ${version} 已存在，产物已冻结，跳过复制（如需发布新内容请先升版本号）`,
    );
  } else {
    await mkdir(destDir, { recursive: true });
    await copyFile(SRC_FILE, destFile);
    console.log(`✔ 已复制 → apps/admin/public/sdk/${version}/litetrack.min.js`);
  }

  // 读取当前契约版本与旧 manifest，用于保留历史版本的 apiVersion
  const currentApiVersion = await getCurrentApiVersion();
  const prevManifest = await readManifest();

  // 扫描所有版本目录重建 manifest（幂等）
  const versions = await scanVersions(
    version,
    currentApiVersion,
    prevManifest.versions ?? [],
  );
  const channels = buildChannels(versions);
  const manifest = { channels, versions };

  await writeFile(
    MANIFEST_FILE,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8',
  );
  console.log(`✔ manifest.json 已更新（共 ${versions.length} 个版本）`);

  // 输出当前 channels 摘要
  for (const [ch, info] of Object.entries(channels)) {
    console.log(`   ${ch} → ${info.latest}`);
  }
}

main().catch((err) => {
  console.error('❌ 发布失败:', err);
  process.exit(1);
});
