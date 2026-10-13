import { randomBytes, randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { createResources } from '../../src/lib/resources.js';
import { collect } from '../../src/modules/collect.js';

export async function auditAdminNavigation({
  page,
  origin,
  resources,
  userId,
  siteId,
  token,
  screenshots,
}: {
  page: Page;
  origin: string;
  resources: ReturnType<typeof createResources>;
  userId: number;
  siteId: number;
  token: string;
  screenshots: string;
}) {
  const title = '第二个项目（验证项目切换与菜单上下文）';
  const secondToken = randomBytes(32).toString('hex');
  const second = await resources.db.site.create({
    data: {
      userId,
      title,
      domain: 'second.example.com',
      tokens: { create: { name: '默认 API Key', token: secondToken } },
    },
  });
  const other = await resources.db.user.create({
    data: {
      githubId: randomUUID(),
      username: 'private-project-owner',
      sites: {
        create: {
          title: '其他用户的项目',
          domain: 'private.example.com',
          tokens: {
            create: {
              name: '默认 API Key',
              token: randomBytes(32).toString('hex'),
            },
          },
        },
      },
    },
    include: { sites: true },
  });
  const extraIds: number[] = [];
  const selectProject = async (label: string) => {
    await page.getByRole('combobox', { name: '选择项目', exact: true }).click();
    await page.getByText(label, { exact: true }).last().click();
  };
  const nav = page.locator('nav[aria-label="主导航"]');
  try {
    for (let count = 0; count < 3; count++)
      await collect(resources.db, second, {
        protocolVersion: 1,
        eventId: randomUUID(),
        visitorId: 'navigation-visitor',
        path: '/welcome',
      });
    await page.goto(origin);
    await page.reload();
    await expect(page.locator('.ant-statistic-content-value')).toHaveText([
      '2',
      '9',
      '3',
      '3',
    ]);
    await selectProject(title + ' · second.example.com');
    await expect(page).toHaveURL(origin + '/?project=' + second.id);
    await expect(page.locator('.ant-statistic-content-value')).toHaveText([
      '3',
      '1',
      '1',
    ]);
    await expect(page.getByText('热门页面', { exact: true })).toBeVisible();
    await page.getByText('近 30 天', { exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp('project=' + second.id + '.*mode=30'),
    );
    await page.reload();
    await expect(page.locator('.ant-statistic-content-value')).toHaveText([
      '3',
      '1',
      '1',
    ]);
    await expect(
      nav.getByRole('menuitem', { name: '数据总览', exact: true }),
    ).toHaveClass(/ant-menu-item-selected/);
    await selectProject('全部项目');
    await expect(page).not.toHaveURL(/project=/);
    await expect(page).toHaveURL(/mode=30/);
    await expect(page.locator('.ant-statistic-content-value')).toHaveText([
      '2',
      '9',
      '3',
      '3',
    ]);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp('project=' + second.id));
    await expect(page.locator('.ant-statistic-content-value')).toHaveText([
      '3',
      '1',
      '1',
    ]);
    await page.screenshot({
      path: screenshots + '/project-overview.png',
      fullPage: true,
    });
    await nav.getByRole('link', { name: '接入指南', exact: true }).click();
    await expect(page).toHaveURL(origin + '/integration?project=' + second.id);
    await page.getByRole('tab', { name: 'Script', exact: true }).click();
    await expect(page.getByRole('tabpanel').locator('code')).toContainText(
      secondToken,
    );
    await selectProject('浏览器验收项目 · ' + new URL(origin).host);
    await expect(page.getByRole('tabpanel').locator('code')).toContainText(
      token,
    );
    await expect(page.getByRole('tabpanel').locator('code')).not.toContainText(
      secondToken,
    );
    await selectProject('通用接入指南');
    await expect(page.getByRole('tabpanel').locator('code')).toContainText(
      'YOUR_API_KEY',
    );
    await expect(page.getByRole('tabpanel').locator('code')).not.toContainText(
      token,
    );
    await page.goto(origin + '/integration?project=' + other.sites[0].id);
    await expect(page.getByText('站点不存在', { exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Script', exact: true }).click();
    await expect(page.getByRole('tabpanel').locator('code')).toContainText(
      'YOUR_API_KEY',
    );
    await page.goto(origin + '/?project=invalid');
    await expect(
      page.getByText('项目参数无效，请重新选择项目。', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('.ant-statistic-content-value')).toHaveCount(0);
    await page.goto(origin + '/sites/' + second.id + '/settings');
    await page.reload();
    await expect(
      nav.getByRole('menuitem', { name: '项目设置', exact: true }),
    ).toHaveClass(/ant-menu-item-selected/);
    await expect(
      nav.getByRole('menuitem', { name: '项目管理', exact: true }),
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.api-key')).toContainText(secondToken);
    await expect(
      page.getByRole('combobox', { name: '选择项目', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('.ant-spin-spinning')).toHaveCount(0);
    await page.screenshot({
      path: screenshots + '/project-settings.png',
      fullPage: true,
    });
    await selectProject('浏览器验收项目 · ' + new URL(origin).host);
    await expect(page).toHaveURL(origin + '/sites/' + siteId + '/settings');
    await expect(page.locator('.api-key')).toContainText(token);
    await expect(page.locator('.api-key')).not.toContainText(secondToken);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(390);
    await page.screenshot({
      path: screenshots + '/project-settings-mobile.png',
      fullPage: true,
    });
    await page.getByRole('button', { name: '打开导航', exact: true }).click();
    const drawer = page.getByRole('dialog');
    await expect(
      drawer.getByRole('menuitem', { name: '项目设置', exact: true }),
    ).toHaveClass(/ant-menu-item-selected/);
    const parent = drawer.getByRole('menuitem', {
      name: '项目管理',
      exact: true,
    });
    await parent.click();
    await expect(parent).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toBeVisible();
    await parent.click();
    await expect(parent).toHaveAttribute('aria-expanded', 'true');
    await drawer.getByRole('link', { name: '项目列表', exact: true }).click();
    await expect(page).toHaveURL(origin + '/sites');
    await expect(drawer).not.toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (let index = 0; index < 9; index++) {
      const extra = await resources.db.site.create({
        data: {
          userId,
          title: '分页项目 ' + index,
          domain: 'pagination-' + index + '.example.com',
        },
      });
      extraIds.push(extra.id);
    }
    await page.reload();
    await page.getByTitle('2', { exact: true }).click();
    await expect(page).toHaveURL(/\/sites\?page=2$/);
    await page.reload();
    await expect(page.locator('.ant-table-tbody .ant-table-row')).toHaveCount(
      1,
    );
    await page
      .getByRole('link', { name: '项目设置', exact: true })
      .last()
      .click();
    await expect(page).toHaveURL(origin + '/sites/' + siteId + '/settings');
    await page.goBack();
    await expect(page).toHaveURL(/\/sites\?page=2$/);
    await expect(page.locator('.ant-table-tbody .ant-table-row')).toHaveCount(
      1,
    );
    await page.screenshot({
      path: screenshots + '/project-management.png',
      fullPage: true,
    });
  } finally {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await resources.db.site.deleteMany({
      where: { id: { in: [second.id, ...extraIds] } },
    });
    await resources.db.user.delete({ where: { id: other.id } });
  }
}
