import { describe, expect, it } from 'vitest';
import { codeTokens } from '../../admin/src/components/code';
import { npmRelease } from '../../admin/src/sdkRelease';

describe('接入代码与发布状态', () => {
  it('代码着色保留原文，字符串中的 HTML 和 URL 不变', () => {
    const source = `import { create } from '@boses/litetrack-sdk';\n// 接入示例\nconst tracker = create({ baseUrl: "https://example.com", siteToken: '<script>alert(1)</script>' });\ntracker.page();`;
    const tokens = codeTokens(source);
    expect(tokens.map((item) => item.text).join('')).toBe(source);
    expect(tokens.some((item) => item.kind === 'keyword')).toBe(true);
    expect(
      tokens.find((item) => item.text === '"https://example.com"')?.kind,
    ).toBe('string');
  });
  it('npm 已发布旧版不代表当前版本可安装；较新的 latest 不隐藏旧版的发布记录', () => {
    const metadata = {
      'dist-tags': { latest: '2.1.0' },
      versions: { '1.1.1': {}, '2.0.0': {}, '2.1.0': {} },
    };
    expect(npmRelease(metadata, '2.0.0')).toEqual({
      latest: '2.1.0',
      currentPublished: true,
    });
    expect(npmRelease(metadata)).toEqual({
      latest: '2.1.0',
      currentPublished: false,
    });
    expect(
      npmRelease(
        { 'dist-tags': { latest: '1.1.1' }, versions: { '1.1.1': {} } },
        '2.0.0',
      ).currentPublished,
    ).toBe(false);
    expect(() => npmRelease({ versions: {} })).toThrow();
  });
});
