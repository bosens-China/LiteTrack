import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { publishSdk } from '../scripts/publish.mjs';
import { assertReleaseVersion } from '../scripts/check-release.mjs';

it('重构只允许新版主版本发布，旧源码基线仅可验证预览', () => {
  expect(() => assertReleaseVersion('1.1.1', true)).not.toThrow();
  for (const version of ['1.1.1', '1.1.2', '1.2.0']) {
    expect(() => assertReleaseVersion(version)).toThrow('2.0.0');
    if (version !== '1.1.1')
      expect(() => assertReleaseVersion(version, true)).toThrow('2.0.0');
  }
  for (const version of ['2.0.0', '2.0.1', '2.1.0', '3.0.0', '10.0.0'])
    expect(() => assertReleaseVersion(version)).not.toThrow();
  for (const version of ['2', '2.0.0-beta.1', 'invalid'])
    expect(() => assertReleaseVersion(version)).toThrow('SemVer');
});

it('发布仅追加记录，重放幂等，拒绝覆盖已发布字节，预览隔离', async () => {
  const root = await mkdtemp(join(tmpdir(), 'litetrack-release-'));
  const sdk = join(root, 'apps/sdk');
  const publicDir = join(root, 'apps/admin/public/sdk');
  try {
    await mkdir(join(sdk, 'dist'), { recursive: true });
    await mkdir(publicDir, { recursive: true });
    await writeFile(
      join(sdk, 'package.json'),
      JSON.stringify({ version: '9.0.0' }),
    );
    await writeFile(join(sdk, 'dist/index.iife.js'), 'first');
    await writeFile(
      join(sdk, 'dist/index.mjs'),
      'export const version = "9.0.0";',
    );
    await writeFile(
      join(sdk, 'dist/index.d.mts'),
      'export declare const version: string;',
    );
    await writeFile(join(sdk, 'dist/index.mjs.map'), '{}');
    await writeFile(join(sdk, 'dist/index.d.mts.map'), '{}');
    const old = {
      version: '1.0.0',
      integrity: 'unchanged',
      size: 10,
      apiVersion: 'v1',
    };
    await writeFile(
      join(publicDir, 'manifest.json'),
      JSON.stringify({ versions: [old] }),
    );
    await publishSdk(root);
    const first = await readFile(join(publicDir, 'manifest.json'), 'utf8');
    expect(JSON.parse(first).versions[0]).toEqual(old);
    expect(await readFile(join(publicDir, '9.0.0/index.mjs'), 'utf8')).toBe(
      'export const version = "9.0.0";',
    );
    expect(
      JSON.parse(first).versions[1].files['index.d.mts'].integrity,
    ).toMatch(/^sha384-/);
    await publishSdk(root);
    expect(await readFile(join(publicDir, 'manifest.json'), 'utf8')).toBe(
      first,
    );
    await writeFile(join(sdk, 'dist/index.d.mts'), 'changed declaration');
    await expect(publishSdk(root)).rejects.toThrow();
    expect(await readFile(join(publicDir, '9.0.0/index.d.mts'), 'utf8')).toBe(
      'export declare const version: string;',
    );
    await writeFile(join(sdk, 'dist/index.iife.js'), 'second');
    await expect(publishSdk(root)).rejects.toThrow();
    expect(
      await readFile(join(publicDir, '9.0.0/litetrack.min.js'), 'utf8'),
    ).toBe('first');
    await publishSdk(root, true);
    expect(await readFile(join(publicDir, 'manifest.json'), 'utf8')).toBe(
      first,
    );
    expect(
      await readFile(join(publicDir, 'preview/litetrack.min.js'), 'utf8'),
    ).toBe('second');
    expect(await readFile(join(publicDir, 'preview/index.d.mts'), 'utf8')).toBe(
      'changed declaration',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
