import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { configSchema } from '../src/lib/config.js';
import { createResources } from '../src/lib/resources.js';
import type { Tracker } from '../../sdk/src/core/types.js';
declare global {
  interface Window {
    LiteTrack: {
      create: (options: { baseUrl: string; siteToken: string }) => Tracker;
    };
  }
}

const config = configSchema.parse(process.env);
assert.match(
  new URL(config.DATABASE_URL).pathname,
  /^\/litetrack_test(?:$|_)/,
  '浏览器测试必须使用独立测试库',
);
const origin = config.PUBLIC_URL;
const resources = createResources(config);
const user = await resources.db.user.create({
  data: { githubId: randomUUID(), username: 'browser-test' },
});
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
const screenshots = process.env.SCREENSHOT_DIR || '/tmp/litetrack-browser';
await mkdir(screenshots, { recursive: true });
try {
  await resources.redis.del('rate:ip:127.0.0.1');
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(origin)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 20000 },
    )
    .toBe(200);
  await page.goto(origin);
  await expect(
    page.getByRole('link', { name: '使用 GitHub 登录' }),
  ).toBeVisible();
  await page.screenshot({ path: screenshots + '/login.png' });
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuer('litetrack')
    .setAudience('admin')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(config.JWT_SECRET));
  await context.addCookies([
    {
      name: 'lt_session',
      value: jwt,
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.reload();
  await expect(page.getByText('还没有项目')).toBeVisible();
  await page.getByRole('button', { name: '新建项目' }).first().click();
  await page.getByLabel('项目名称').fill('浏览器验收项目');
  await page.getByLabel('域名', { exact: true }).fill(new URL(origin).host);
  await page.getByRole('button', { name: '保存项目' }).click();
  await expect(page).toHaveURL(/\/sites\/\d+\/settings/);
  const settingsUrl = page.url();
  const siteId = Number(settingsUrl.split('/sites/')[1].split('/')[0]);
  await page.getByRole('button', { name: '创建 API Key' }).click();
  await page.getByLabel('API Key 名称').fill('浏览器采集');
  await page.getByRole('button', { name: /^创\s*建$/ }).click();
  const tokenInput = page.getByLabel('API Key 浏览器采集', { exact: true });
  await expect(tokenInput).toBeVisible();
  const token = await tokenInput.inputValue();
  assert.match(token, /^[a-f0-9]{64}$/);
  await page.reload();
  await expect(tokenInput).toHaveValue(token);
  await expect(tokenInput).toHaveAttribute('type', 'password');
  await page
    .getByRole('button', { name: '复制 API Key 浏览器采集', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(token);
  await page.getByRole('tab', { name: 'AI Skills', exact: true }).click();
  await page
    .getByRole('tabpanel')
    .getByRole('button', { name: '复制代码', exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('npx skills add bosens-China/LiteTrack --skill integrate-litetrack');
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.screenshot({ path: screenshots + '/skills.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  const commandBox = await page
    .getByRole('tabpanel')
    .locator('pre')
    .boundingBox();
  const copyBox = await page
    .getByRole('tabpanel')
    .getByRole('button', { name: '复制代码', exact: true })
    .boundingBox();
  assert.ok(
    commandBox && copyBox && commandBox.x + commandBox.width <= copyBox.x,
  );
  await page.screenshot({
    path: screenshots + '/skills-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('tab', { name: '本地文件', exact: true }).click();
  for (const name of ['index.mjs', 'index.d.mts']) {
    const contents = await (
      await fetch(origin + '/sdk/preview/' + name)
    ).text();
    await page
      .getByRole('button', { name: '复制 ' + name, exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(contents);
  }
  const downloadReady = page.waitForEvent('download');
  await page
    .getByRole('link', { name: '下载 index.d.mts', exact: true })
    .click();
  const download = await downloadReady;
  assert.equal(download.suggestedFilename(), 'index.d.mts');
  assert.equal(
    await readFile((await download.path())!, 'utf8'),
    await (await fetch(origin + '/sdk/preview/index.d.mts')).text(),
  );
  await page.screenshot({
    path: screenshots + '/settings.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await page.screenshot({
    path: screenshots + '/settings-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const sendPages = async (
    target: typeof page,
    paths: string[],
    format: 'esm' | 'script' = 'script',
  ) => {
    if (format === 'script')
      await target.addScriptTag({
        url: origin + '/sdk/preview/litetrack.min.js',
      });
    await target.evaluate(
      async ({ origin, token, paths, format }) => {
        const sdk =
          format === 'esm'
            ? ((await import(
                origin + '/sdk/preview/index.mjs'
              )) as Window['LiteTrack'])
            : window.LiteTrack;
        const tracker = sdk.create({ baseUrl: origin, siteToken: token });
        for (const path of paths)
          tracker.page({ path, title: path === '/docs' ? '文档' : '首页' });
        tracker.destroy();
      },
      { origin, token, paths, format },
    );
  };
  await sendPages(page, ['/welcome', '/welcome', '/docs', '/welcome'], 'esm');
  await expect
    .poll(() => resources.db.pageviewEvent.count({ where: { siteId } }))
    .toBe(3);
  await page.reload();
  await sendPages(page, ['/welcome']);
  const second = await browser.newContext();
  const secondPage = await second.newPage();
  const secondTab = await second.newPage();
  await secondPage.goto(origin);
  await secondTab.goto(origin);
  await Promise.all([
    sendPages(secondPage, ['/welcome']),
    sendPages(secondTab, ['/docs']),
  ]);
  await expect
    .poll(() => resources.db.pageviewEvent.count({ where: { siteId } }))
    .toBe(6);
  await second.close();
  await page.goto(origin + '/sites/' + siteId);
  await expect(page.locator('.metric strong')).toHaveText(['6', '2', '2']);
  await expect(page.locator('canvas')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('canvas').evaluate((canvas) => {
        if (!(canvas instanceof HTMLCanvasElement))
          throw new Error('图表不是 canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return 0;
        return ctx
          .getImageData(0, 0, canvas.width, canvas.height)
          .data.filter((v, i) => i % 4 === 3 && v > 0).length;
      }),
    )
    .toBeGreaterThan(500);
  await page.screenshot({ path: screenshots + '/desktop.png', fullPage: true });
  await page.getByText('近 30 天', { exact: true }).click();
  await expect(page).toHaveURL(/mode=30/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await expect
    .poll(() =>
      page
        .locator('canvas')
        .evaluate((canvas) => canvas.getBoundingClientRect().width),
    )
    .toBeLessThan(390);
  await page.screenshot({ path: screenshots + '/mobile.png', fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    '窄屏不允许整页横向溢出',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(settingsUrl);
  await page.getByRole('button', { name: '编辑项目' }).click();
  await page.getByLabel('项目名称').fill('验收项目已编辑');
  await page.getByRole('button', { name: '保存项目' }).click();
  await expect(page.locator('.site-details')).toContainText('验收项目已编辑');
  await page.getByRole('switch', { name: '启用 浏览器采集' }).click();
  await expect
    .poll(
      async () =>
        (await resources.db.siteToken.findUnique({ where: { token } }))
          ?.isActive,
    )
    .toBe(false);
  const disabled = await context.request.post(origin + '/litetrack/collect', {
    headers: { 'X-Site-Token': token },
    data: {
      protocolVersion: 1,
      eventId: randomUUID(),
      visitorId: randomUUID(),
      path: '/',
    },
  });
  assert.equal(disabled.status(), 401);
  await page.getByRole('button', { name: '删除项目', exact: true }).click();
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await expect(page.getByText('还没有项目')).toBeVisible();
  assert.equal(
    await resources.db.pageviewEvent.count({ where: { siteId } }),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    '浏览器验收通过：项目/API Key 取回复制、JS/类型复制下载、ESM/IIFE 采集、指标、图表和桌面/窄屏',
  );
} finally {
  await browser.close();
  await resources.db.user.delete({ where: { id: user.id } });
  await resources.db.$disconnect();
  resources.redis.disconnect();
}
