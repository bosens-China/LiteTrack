import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from '../src/index';
import type { LiteTrackError } from '../src/core/types';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function getJsonBody(index: number): Record<string, unknown> {
  const options = mockFetch.mock.calls[index]?.[1] as
    | { body?: string }
    | undefined;
  if (!options?.body) return {};
  return JSON.parse(options.body) as Record<string, unknown>;
}

let localStorageMock: MemoryStorage;
let sessionStorageMock: MemoryStorage;

beforeEach(() => {
  localStorageMock = new MemoryStorage();
  sessionStorageMock = new MemoryStorage();

  globalThis.window = {
    location: { pathname: '/docs/start' },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Window & typeof globalThis;

  globalThis.document = {
    title: 'LiteTrack 文档',
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as Document;

  globalThis.localStorage = localStorageMock as unknown as Storage;
  globalThis.sessionStorage = sessionStorageMock as unknown as Storage;
  globalThis.fetch = mockFetch as unknown as typeof fetch;

  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({}),
  } as Response);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.window = originalWindow;
  globalThis.document = originalDocument;
  globalThis.localStorage = originalLocalStorage;
  globalThis.sessionStorage = originalSessionStorage;
  vi.clearAllMocks();
});

describe('create', () => {
  it('does not send anything on init', () => {
    create({ siteToken: 'st_test', baseUrl: 'https://api.example.com' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('page() sends a pageview, using window.location as default path', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      identity: { visitorId: 'visitor-1', sessionId: 'session-1' },
    });

    tracker.page();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.example.com/litetrack/v1/track',
    );
    expect(getJsonBody(0)).toMatchObject({
      path: '/docs/start',
      title: 'LiteTrack 文档',
      visitorId: 'visitor-1',
      sessionId: 'session-1',
    });
  });

  it('page() accepts an explicit path and title', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      identity: { visitorId: 'visitor-1', sessionId: 'session-1' },
    });

    tracker.page({ path: '/about', title: '关于我们' });

    expect(getJsonBody(0)).toMatchObject({ path: '/about', title: '关于我们' });
  });

  it('read() falls back to the current window.location path in real time', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      identity: { visitorId: 'visitor-1', sessionId: 'session-1' },
    });

    // SPA 导航后 location 变化，read() 不依赖 page() 状态，应实时读取当前路径
    (
      globalThis.window as unknown as { location: { pathname: string } }
    ).location.pathname = '/posts/hello';
    tracker.read(75);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      'https://api.example.com/litetrack/v1/track/read-progress',
    );
    expect(getJsonBody(0)).toMatchObject({
      path: '/posts/hello',
      maxDepth: 75,
      visitorId: 'visitor-1',
      sessionId: 'session-1',
    });
  });

  it('read() accepts an object with explicit path and percent', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      identity: { visitorId: 'visitor-1', sessionId: 'session-1' },
    });

    tracker.read({ path: '/posts/hello', percent: 50 });

    expect(getJsonBody(0)).toMatchObject({
      path: '/posts/hello',
      maxDepth: 50,
    });
  });

  it('identify() updates the identity used in subsequent calls', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      identity: { visitorId: 'visitor-1' },
    });

    // read() 实时读取 location，对齐到 /manual 以便聚焦验证身份字段的传递
    (
      globalThis.window as unknown as { location: { pathname: string } }
    ).location.pathname = '/manual';
    tracker.identify({ sessionId: 'session-2' });
    tracker.page({ path: '/manual', title: '手动页面' });
    tracker.read(90);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(getJsonBody(0)).toMatchObject({
      path: '/manual',
      title: '手动页面',
      visitorId: 'visitor-1',
      sessionId: 'session-2',
    });
    expect(getJsonBody(1)).toMatchObject({
      path: '/manual',
      maxDepth: 90,
      visitorId: 'visitor-1',
      sessionId: 'session-2',
    });
  });

  it('uses in-memory identity fallback when storage is unavailable', () => {
    globalThis.localStorage = undefined as unknown as Storage;
    globalThis.sessionStorage = undefined as unknown as Storage;

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
    });

    tracker.page({ path: '/memory', title: 'Memory Mode' });
    tracker.read({ path: '/memory', percent: 80 });

    expect(getJsonBody(0)).toMatchObject({
      visitorId: expect.stringMatching(/^ltv_/),
      sessionId: expect.stringMatching(/^lts_/),
    });
    expect(getJsonBody(1)).toMatchObject({
      maxDepth: 80,
      visitorId: expect.stringMatching(/^ltv_/),
      sessionId: expect.stringMatching(/^lts_/),
    });
  });

  it('reports network failures through onError for fire-and-forget calls', async () => {
    const errors: LiteTrackError[] = [];
    mockFetch.mockRejectedValue(new Error('Network error'));

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      onError(error) {
        errors.push(error);
      },
    });

    tracker.page({ path: '/error' });

    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('NETWORK_ERROR');
  });

  it('ignores all calls after destroy()', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
    });

    tracker.destroy();
    tracker.page({ path: '/after-destroy' });
    tracker.read(50);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('stats', () => {
  it('queries site stats via tracker.stats.site()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ totalViews: 100, totalPages: 5 }),
    } as Response);

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
    });
    const result = await tracker.stats.site();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/litetrack/v1/track/stats',
      {
        method: 'GET',
        headers: {
          'X-Site-Token': 'st_test',
          'X-LiteTrack-SDK': '1.0.0-dev',
        },
      },
    );
    expect(result).toEqual({ totalViews: 100, totalPages: 5 });
  });

  it('queries page stats via tracker.stats.page()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ path: '/docs/start', count: 42 }),
    } as Response);

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
    });
    const result = await tracker.stats.page('docs/start/');

    const [url] = mockFetch.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://api.example.com/litetrack/v1/track/stats?path=%2Fdocs%2Fstart',
    );
    expect(result).toEqual({ path: '/docs/start', count: 42 });
  });

  it('throws and reports onError when stats request returns a bad status', async () => {
    const errors: LiteTrackError[] = [];
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com',
      onError(error) {
        errors.push(error);
      },
    });

    await expect(tracker.stats.site()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 401,
    });
    expect(errors[0]?.code).toBe('HTTP_ERROR');
  });
});
