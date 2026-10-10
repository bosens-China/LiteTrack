import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sdk = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const temp = await mkdtemp(join(tmpdir(), 'litetrack-consumer-'));
try {
  execFileSync('pnpm', ['pack', '--pack-destination', temp], {
    cwd: sdk,
    stdio: 'pipe',
  });
  const tarball = (await readdir(temp)).find((file) => file.endsWith('.tgz'));
  assert.ok(tarball);
  await writeFile(
    join(temp, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  for (const name of ['index.mjs', 'index.d.mts'])
    await copyFile(join(sdk, 'dist', name), join(temp, name));
  const local = join(temp, 'local.ts');
  await writeFile(
    local,
    "import { create, type Tracker } from './index.mjs';\nconst tracker: Tracker = create({baseUrl:'https://example.com',siteToken:'a'.repeat(64)});\ntracker.page();\n",
  );
  execFileSync(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '--strict',
      '--noEmit',
      '--target',
      'ES2022',
      '--module',
      'nodenext',
      local,
    ],
    { cwd: temp, stdio: 'pipe' },
  );
  const localSdk = await import(pathToFileURL(join(temp, 'index.mjs')).href);
  localSdk
    .create({ baseUrl: 'https://example.com', siteToken: 'a'.repeat(64) })
    .page();
  execFileSync(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(temp, tarball),
    ],
    { cwd: temp, stdio: 'pipe' },
  );
  const consumer = join(temp, 'consumer.ts');
  await writeFile(
    consumer,
    "import { create, type Tracker } from '@boses/litetrack-sdk';\nconst tracker: Tracker = create({baseUrl:'https://example.com',siteToken:'a'.repeat(64)});\ntracker.page({path:'/typed'});tracker.destroy();\n",
  );
  execFileSync(
    process.execPath,
    [
      require.resolve('typescript/bin/tsc'),
      '--strict',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'ES2022',
      '--module',
      'nodenext',
      consumer,
    ],
    { cwd: temp, stdio: 'pipe' },
  );
  const pkg = JSON.parse(
    await readFile(
      join(temp, 'node_modules/@boses/litetrack-sdk/package.json'),
      'utf8',
    ),
  );
  assert.equal(pkg.dependencies, undefined);
  const module = await import(
    pathToFileURL(
      join(temp, 'node_modules/@boses/litetrack-sdk/dist/index.mjs'),
    ).href
  );
  assert.equal(module.version, pkg.version);
  module
    .create({ baseUrl: 'https://example.com', siteToken: 'a'.repeat(64) })
    .page();
  console.log(
    '本地 JS + 类型（无 npm）及 npm tarball: 独立安装、类型与 SSR 验证通过',
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
