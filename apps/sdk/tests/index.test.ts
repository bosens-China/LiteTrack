import { afterEach, describe, expect, it, vi } from 'vitest';
import { create } from '../src/index';

const options = {
  siteToken: 'a'.repeat(64),
  baseUrl: 'https://stats.example.com',
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function browser(storageFails = false) {
  const values = new Map<string, string>();
  vi.stubGlobal('window', {
    location: { pathname: '/first' },
    localStorage: {
      getItem: (key: string) => {
        if (storageFails) throw new Error('blocked');
        return values.get(key);
      },
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  vi.stubGlobal('document', {
    title: '文章',
    referrer: 'https://github.com/example',
  });
  const fetch = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
describe('页面采集', () => {
  it('SSR 初始化不访问存储或发送事件', () => {
    vi.stubGlobal('window', undefined);
    const tracker = create(options);
    expect(() => tracker.page()).not.toThrow();
  });
  it('初始化不发送，重复调用幂等，路径往返与新访问各计一次', async () => {
    const fetch = browser();
    const tracker = create(options);
    expect(fetch).not.toHaveBeenCalled();
    tracker.page();
    tracker.page();
    tracker.page({ path: '/second/?q=secret' });
    tracker.page({ path: '/first' });
    tracker.page({ path: '/first', newVisit: true });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4));
    const payloads = fetch.mock.calls.map(
      (call) =>
        JSON.parse(call[1].body as string) as {
          eventId: string;
          path: string;
          visitorId: string;
          referrer: string;
        },
    );
    expect(new Set(payloads.map((p) => p.eventId)).size).toBe(4);
    expect(new Set(payloads.map((p) => p.visitorId)).size).toBe(1);
    expect(payloads[1].path).toBe('/second');
    expect(payloads[0].referrer).toBe('https://github.com/example');
    tracker.destroy();
    tracker.destroy();
    tracker.page({ path: '/ignored' });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('存储失败时同命名空间实例共享内存身份', async () => {
    const fetch = browser(true);
    create(options).page();
    create(options).page();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const first = JSON.parse(fetch.mock.calls[0][1].body as string) as {
      visitorId: string;
    };
    const second = JSON.parse(fetch.mock.calls[1][1].body as string) as {
      visitorId: string;
    };
    expect(first.visitorId).toBe(second.visitorId);
  });
  it('HTTP 错误和用户错误回调均不破坏宿主', async () => {
    const fetch = browser();
    fetch.mockResolvedValue({ ok: false, status: 401 });
    const onError = vi.fn(() => {
      throw new Error('用户回调');
    });
    expect(() => create({ ...options, onError }).page()).not.toThrow();
    await vi.waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'HTTP_ERROR', status: 401 }),
      ),
    );
  });
  it('超时主动取消请求并报告一次', async () => {
    browser();
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) =>
            init.signal?.addEventListener('abort', () =>
              reject(new Error('aborted')),
            ),
          ),
      ),
    );
    const onError = vi.fn();
    create({ ...options, timeoutMs: 100, onError }).page();
    await vi.advanceTimersByTimeAsync(101);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TIMEOUT' }),
    );
    expect(onError).toHaveBeenCalledTimes(1);
  });
  it('非法配置同步拒绝，不发送请求', () => {
    expect(() =>
      create({ ...options, baseUrl: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() => create({ ...options, timeoutMs: -1 })).toThrow();
  });
});
