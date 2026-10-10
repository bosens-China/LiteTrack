import { describe, expect, it } from 'vitest';
import { collectSchema, rangeSchema } from '@litetrack/contracts';
import { normalizePath } from '@litetrack/contracts/path';
import { referrerDomain } from '../src/modules/collect.js';
import { boundaries, todayRange } from '../src/modules/stats.js';
import { configSchema } from '../src/lib/config.js';

describe('统计边界', () => {
  it('默认配置只连接新版独立 Redis', () => {
    const config = configSchema.parse({
      DATABASE_URL: 'postgresql://localhost/litetrack_test',
      JWT_SECRET: 'test-secret-'.repeat(4),
    });
    expect(config.REDIS_URL).toBe('redis://127.0.0.1:26381');
    expect(config.TRUST_PROXY).toBe('');
  });
  it('校验真实日期、方向、上限与独立协议', () => {
    expect(
      rangeSchema.safeParse({ start: '2026-02-30', end: '2026-03-01' }).success,
    ).toBe(false);
    expect(
      rangeSchema.safeParse({ start: '2026-10-10', end: '2026-10-09' }).success,
    ).toBe(false);
    expect(
      collectSchema.safeParse({
        protocolVersion: 99,
        eventId: 'event-123',
        visitorId: 'visitor-123',
        path: '/',
      }).success,
    ).toBe(false);
  });
  it('中国自然日使用明确 UTC 边界', () => {
    expect(boundaries({ start: '2026-10-10', end: '2026-10-10' })).toEqual({
      start: new Date('2026-10-09T16:00:00Z'),
      end: new Date('2026-10-10T16:00:00Z'),
    });
    expect(todayRange(new Date('2026-10-09T16:00:00Z')).start).toBe(
      '2026-10-10',
    );
  });
  it('来源只保留外部域名', () => {
    expect(
      referrerDomain('https://GitHub.com/a?secret=123', 'blog.example.com'),
    ).toBe('github.com');
    expect(
      referrerDomain(
        'https://www.blog.example.com/previous',
        'blog.example.com',
      ),
    ).toBe('direct');
    expect(referrerDomain('javascript:evil', 'blog.example.com')).toBe(
      'direct',
    );
  });
  it('路径移除敏感 query，保留大小写和逻辑路径', () => {
    expect(normalizePath(' /Article/?secret=1#heading ')).toBe('/Article');
    expect(normalizePath('///')).toBe('/');
  });
});
