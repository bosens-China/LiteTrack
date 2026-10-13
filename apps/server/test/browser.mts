import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { SignJWT } from 'jose';
import { configSchema } from '../src/lib/config.js';
import { createResources } from '../src/lib/resources.js';
import type { Tracker } from '../../sdk/src/core/types.js';
import { auditAdminNavigation } from './browser/admin-navigation.mjs';
import { auditNpmRelease } from './browser/npm-release.mjs';
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
  await page.route('https://registry.npmjs.org/**', (route) =>
    route.fulfill({
      json: { 'dist-tags': { latest: '1.1.1' }, versions: { '1.1.1': {} } },
    }),
  );
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
  await page.goto(origin + '/integration');
  await expect(
    page.getByRole('tab', { name: 'AI Skills', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: '下载 index.d.mts', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('tabpanel').locator('code').last()).toContainText(
    'YOUR_API_KEY',
  );
  await page.getByRole('menuitem', { name: '项目管理', exact: true }).click();
  await page
    .getByRole('link', { name: '项目列表', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(
    page.getByRole('heading', { name: '项目列表', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '新建项目' }).first().click();
  await page.getByLabel('项目名称').fill('浏览器验收项目');
  await page.getByLabel('域名', { exact: true }).fill(new URL(origin).host);
  await page.getByRole('button', { name: '保存项目' }).click();
  await expect(page.getByText('项目创建成功', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '前往接入指南' }).click();
  await expect(page).toHaveURL(/\/integration\?project=\d+/);
  const integrationUrl = page.url();
  const siteId = Number(new URL(integrationUrl).searchParams.get('project'));
  const settingsUrl = origin + '/sites/' + siteId + '/settings';
  await page.goto(settingsUrl);
  const tokenText = page.locator('.api-key').first();
  await expect(tokenText).toBeVisible();
  const token = (await tokenText.locator('code').textContent())!;
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(await resources.db.siteToken.count({ where: { siteId } }), 1);
  await page.reload();
  await expect(tokenText).toContainText(token);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await tokenText.getByRole('button').click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(token);
  await expect(
    page.getByRole('button', { name: '创建 API Key', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('tab', { name: 'Script', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: '接入指南', exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(integrationUrl);
  await auditNpmRelease(page);
  await page.getByRole('tab', { name: 'Script', exact: true }).click();
  await expect(
    page.getByRole('tabpanel').locator('.syntax-keyword'),
  ).not.toHaveCount(0);
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
    commandBox && copyBox && copyBox.y + copyBox.height <= commandBox.y,
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
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.screenshot({
    path: screenshots + '/integration.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await page.screenshot({
    path: screenshots + '/integration-mobile.png',
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
  await expect(page).toHaveURL(origin + '/?project=' + siteId);
  await expect(page.locator('.ant-statistic-content-value')).toHaveText([
    '6',
    '2',
    '2',
  ]);
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
  await page.goto(origin);
  await expect(page.locator('.ant-statistic-content-value')).toHaveText([
    '1',
    '6',
    '2',
    '2',
  ]);
  await expect(page.getByText('项目访问排行', { exact: true })).toBeVisible();
  await page.screenshot({
    path: screenshots + '/dashboard.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
  await page.getByRole('button', { name: '打开导航', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('menuitem', { name: '项目管理', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('link', { name: '项目列表', exact: true })
    .click();
  await expect(page).toHaveURL(/\/sites$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goto(origin);
  await page.screenshot({
    path: screenshots + '/dashboard-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await auditAdminNavigation({
    page,
    origin,
    resources,
    userId: user.id,
    siteId,
    token,
    screenshots,
  });
  await page.goto(settingsUrl);
  await page.getByRole('button', { name: '编辑项目' }).click();
  await page.getByLabel('项目名称').fill('验收项目已编辑');
  await page.getByRole('button', { name: '保存项目' }).click();
  await expect(page.locator('.site-details')).toContainText('验收项目已编辑');
  await page.getByRole('switch', { name: '启用 默认 API Key' }).click();
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
  await page.goto(integrationUrl);
  await expect(
    page.getByText('该项目暂无启用的 API Key', { exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Script', exact: true }).click();
  await expect(page.getByRole('tabpanel').locator('code')).toContainText(
    'YOUR_API_KEY',
  );
  await page.goto(settingsUrl);
  await page.getByRole('button', { name: '删除项目', exact: true }).click();
  await page.getByRole('button', { name: '永久删除', exact: true }).click();
  await expect(page.getByText('还没有项目')).toBeVisible();
  assert.equal(
    await resources.db.pageviewEvent.count({ where: { siteId } }),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    '浏览器验收通过：独立接入指南、全局/项目切换、二级菜单、历史/日期/分页、Key 隔离、SDK 采集与桌面/窄屏',
  );
} finally {
  await browser.close();
  await resources.db.user.delete({ where: { id: user.id } });
  await resources.db.$disconnect();
  resources.redis.disconnect();
}
