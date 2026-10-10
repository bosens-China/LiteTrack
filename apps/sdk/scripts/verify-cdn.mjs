import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const origin = process.env.SDK_CDN_ORIGIN;
assert.ok(
  origin,
  '正式发布前必须设置 SDK_CDN_ORIGIN，并部署对应 SHA 的 admin 镜像',
);
const record = JSON.parse(
  await readFile(
    new URL('../../admin/public/sdk/current.json', import.meta.url),
    'utf8',
  ),
);
assert.ok(
  record.files?.['index.mjs'] && record.files?.['index.d.mts'],
  '缺少本地接入的 JS 或类型声明',
);
for (const file of Object.values(record.files)) {
  const response = await fetch(new URL(file.url, origin), {
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(response.ok, 'CDN 固定版本地址不可用');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(
    'sha384-' + createHash('sha384').update(bytes).digest('base64'),
    file.integrity,
    'CDN 与 npm 构建不一致，拒绝发布',
  );
  assert.equal(bytes.length, file.size);
}
console.log('CDN JS、类型声明与 source map 的固定版本及 SRI 验证通过');
