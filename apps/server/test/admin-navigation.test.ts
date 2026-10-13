import { describe, expect, it } from 'vitest';
import {
  analyticsUrl,
  navigationKey,
  projectId,
} from '../../admin/src/navigation';

describe('项目导航', () => {
  it('只接受有效项目 ID，不把非法值解释成全部项目', () => {
    expect(projectId('42')).toBe(42);
    for (const value of [
      null,
      '',
      '0',
      '-1',
      '1.5',
      '1e2',
      '42abc',
      '9007199254740992',
    ])
      expect(projectId(value)).toBeUndefined();
  });
  it('统一统计入口保留日期和分页，移除全局视图的项目筛选', () => {
    expect(analyticsUrl(42, '?start=2026-10-01&end=2026-10-13&page=2')).toBe(
      '/?start=2026-10-01&end=2026-10-13&page=2&project=42',
    );
    expect(analyticsUrl(undefined, '?project=42&mode=30')).toBe('/?mode=30');
  });
  it('二级导航选中与地址对应，未知页面不误选项目管理', () => {
    expect(navigationKey('/')).toBe('/');
    expect(navigationKey('/integration')).toBe('/integration');
    expect(navigationKey('/sites')).toBe('/sites');
    expect(navigationKey('/sites/settings')).toBe('/sites/settings');
    expect(navigationKey('/sites/42/settings')).toBe('/sites/settings');
    expect(navigationKey('/unknown')).toBeUndefined();
  });
});
