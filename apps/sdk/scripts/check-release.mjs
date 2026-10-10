import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assertReleaseVersion(version, preview = false) {
  assert.match(version, /^\d+\.\d+\.\d+$/, 'SDK 必须使用稳定 SemVer');
  // 1.1.1 仅作为尚未合并 release PR 时的源码基线，不允许重新发布。
  assert.ok(
    (preview && version === '1.1.1') || Number(version.split('.')[0]) >= 2,
    '本轮重构必须升级到 2.0.0 或更高主版本，请使用 feat(sdk)! / BREAKING CHANGE 触发 release-please',
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { version } = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );
  assertReleaseVersion(version, process.argv.includes('--preview'));
}
