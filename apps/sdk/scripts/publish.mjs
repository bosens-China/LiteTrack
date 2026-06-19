/**
 * SDK 发布脚本
 *
 * 用途：把构建好的 IIFE 复制到 admin 静态目录，更新版本清单。
 * 运行：node apps/sdk/scripts/publish.mjs
 *
 * 每次发版流程：
 *   1. 改 apps/sdk/package.json 版本号
 *   2. pnpm -C apps/sdk build
 *   3. node apps/sdk/scripts/publish.mjs
 *   4. git add apps/admin/public/sdk && git commit
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
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
 */
async function scanVersions() {
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

    const major = ver.split('.')[0] ?? '1';
    const integrity = await computeIntegrity(file);
    const size = await getFileSize(file);

    versions.push({
      version: ver,
      apiVersion: `v${major}`,
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

  // 复制 IIFE 到版本化路径
  await mkdir(destDir, { recursive: true });
  await copyFile(SRC_FILE, destFile);
  console.log(`✔ 已复制 → apps/admin/public/sdk/${version}/litetrack.min.js`);

  // 扫描所有版本目录重建 manifest（幂等）
  const versions = await scanVersions();
  const channels = buildChannels(versions);
  const manifest = { channels, versions };

  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
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
