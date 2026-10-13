import { readFile } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';

export async function auditNpmRelease(page: Page) {
  const { version } = JSON.parse(
    await readFile(
      new URL('../../../sdk/package.json', import.meta.url),
      'utf8',
    ),
  ) as { version: string };
  const preview = await page
    .getByText('当前构建：开发预览', { exact: true })
    .isVisible();
  await page.getByRole('tab', { name: 'npm', exact: true }).click();
  await expect(page.getByText('npm 最新已发布版本：1.1.1')).toBeVisible();
  await expect(
    page.getByText(
      preview
        ? '当前构建是新采集协议的开发预览。'
        : '当前 SDK 的静态产物已就绪，npm 包尚未发布。',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.getByRole('tabpanel').locator('code')).toHaveCount(0);

  await page.unroute('https://registry.npmjs.org/**');
  await page.route('https://registry.npmjs.org/**', (route) =>
    route.fulfill({
      json: {
        'dist-tags': { latest: version },
        versions: { '1.1.1': {}, [version]: {} },
      },
    }),
  );
  await page.reload();
  await page.getByRole('tab', { name: 'npm', exact: true }).click();
  await expect(page.getByText('npm 最新已发布版本：' + version)).toBeVisible();
  if (preview)
    await expect(page.getByRole('tabpanel').locator('code')).toHaveCount(0);
  else
    await expect(page.getByRole('tabpanel').locator('code').first()).toHaveText(
      'pnpm add @boses/litetrack-sdk@' + version,
    );
}
