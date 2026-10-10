import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertReleaseVersion } from './check-release.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const integrity = (bytes) =>
  'sha384-' + createHash('sha384').update(bytes).digest('base64');
export async function publishSdk(root = ROOT, preview = false) {
  const outputs = {
    'litetrack.min.js': 'index.iife.js',
    'index.mjs': 'index.mjs',
    'index.d.mts': 'index.d.mts',
    'index.mjs.map': 'index.mjs.map',
    'index.d.mts.map': 'index.d.mts.map',
  };
  const contents = Object.fromEntries(
    await Promise.all(
      Object.entries(outputs).map(async ([name, source]) => [
        name,
        await readFile(resolve(root, 'apps/sdk/dist', source)),
      ]),
    ),
  );
  const publicDir = resolve(root, 'apps/admin/public/sdk');
  if (preview) {
    await mkdir(resolve(publicDir, 'preview'), { recursive: true });
    for (const [name, bytes] of Object.entries(contents))
      await writeFile(resolve(publicDir, 'preview', name), bytes);
    return;
  }
  const { version } = JSON.parse(
    await readFile(resolve(root, 'apps/sdk/package.json'), 'utf8'),
  );
  assertReleaseVersion(version);
  const { PROTOCOL_VERSION } = await import('../contracts/dist/protocol.mjs');
  const manifestFile = resolve(publicDir, 'manifest.json');
  const manifest = existsSync(manifestFile)
    ? JSON.parse(await readFile(manifestFile, 'utf8'))
    : { versions: [] };
  const files = Object.fromEntries(
    Object.entries(contents).map(([name, bytes]) => [
      name,
      {
        url: '/sdk/' + version + '/' + name,
        integrity: integrity(bytes),
        size: bytes.length,
      },
    ]),
  );
  const record = {
    version,
    protocolVersion: PROTOCOL_VERSION,
    ...files['litetrack.min.js'],
    files,
  };
  const previous = manifest.versions.find((item) => item.version === version);
  if (
    previous &&
    (previous.integrity !== record.integrity ||
      previous.size !== record.size ||
      JSON.stringify(previous.files) !== JSON.stringify(files))
  )
    throw new Error('已登记版本不允许改变，请通过 release-please 发新版本');
  for (const [name, bytes] of Object.entries(contents)) {
    const dest = resolve(publicDir, version, name);
    if (existsSync(dest) && !(await readFile(dest)).equals(bytes))
      throw new Error('已发布文件字节不同，拒绝覆盖：' + name);
  }
  await mkdir(resolve(publicDir, version), { recursive: true });
  for (const [name, bytes] of Object.entries(contents)) {
    const dest = resolve(publicDir, version, name);
    await writeFile(dest, bytes, { flag: 'wx' }).catch((error) => {
      if (error.code !== 'EEXIST') throw error;
    });
    if (!(await readFile(dest)).equals(bytes))
      throw new Error('并发发布的文件字节不一致：' + name);
  }
  if (!previous) manifest.versions.push(record);
  // 历史记录原样保留；只维护一个当前版本指针。
  delete manifest.channels;
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(
    resolve(publicDir, 'current.json'),
    JSON.stringify(record, null, 2) + '\n',
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await publishSdk(ROOT, process.argv.includes('--preview'));
}
