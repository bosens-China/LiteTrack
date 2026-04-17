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

class MockEventTarget {
  private readonly listeners = new Map<string, Set<() => void>>();

  addEventListener(type: string, listener: () => void): void {
    const bucket = this.listeners.get(type) ?? new Set<() => void>();
    bucket.add(listener);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalLocalStorage = globalThis.localStorage;
const originalSessionStorage = globalThis.sessionStorage;

function getJsonBody(index: number): Record<string, unknown> {
  const options = mockFetch.mock.calls[index]?.[1] as { body?: string } | undefined;

  if (!options?.body) {
    return {};
  }

  return JSON.parse(options.body) as Record<string, unknown>;
}

let localStorageMock: MemoryStorage;
let sessionStorageMock: MemoryStorage;
let windowEvents: MockEventTarget;
let documentEvents: MockEventTarget;

beforeEach(() => {
  localStorageMock = new MemoryStorage();
  sessionStorageMock = new MemoryStorage();
  windowEvents = new MockEventTarget();
  documentEvents = new MockEventTarget();

  const documentElement = {
    clientHeight: 250,
    scrollHeight: 1000,
    offsetHeight: 1000,
    scrollTop: 0,
  };
  const body = {
    scrollHeight: 1000,
    offsetHeight: 1000,
    scrollTop: 0,
  };

  globalThis.window = {
    addEventListener: windowEvents.addEventListener.bind(windowEvents),
    removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
    innerHeight: 250,
    location: {
      pathname: '/docs/start',
    },
    scrollY: 0,
  } as unknown as Window & typeof globalThis;

  globalThis.document = {
    addEventListener: documentEvents.addEventListener.bind(documentEvents),
    removeEventListener: documentEvents.removeEventListener.bind(documentEvents),
    body,
    documentElement,
    title: 'LiteTrack 文档',
    visibilityState: 'visible',
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
  it('auto tracks pageview and first read milestone', () => {
    create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoReadProgress: true,
      identity: {
        visitorId: 'visitor-1',
        sessionId: 'session-1',
      },
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/litetrack/v1/track');
    expect(mockFetch.mock.calls[1][0]).toBe(
      'https://api.example.com/litetrack/v1/track/read-progress',
    );
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({
        path: '/docs/start',
        title: 'LiteTrack 文档',
        visitorId: 'visitor-1',
        sessionId: 'session-1',
      }),
    });
    expect(mockFetch.mock.calls[1][1]).toMatchObject({
      body: JSON.stringify({
        path: '/docs/start',
        maxDepth: 25,
        visitorId: 'visitor-1',
        sessionId: 'session-1',
      }),
    });
  });

  it('resets reading milestones after navigate in SPA usage', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoReadProgress: true,
      readProgressMilestones: [25, 50],
      identity: {
        visitorId: 'visitor-1',
      },
    });

    (globalThis.window as unknown as { scrollY: number }).scrollY = 500;
    windowEvents.dispatch('scroll');

    tracker.navigate({
      path: '/posts/next',
      title: '下一篇',
    });

    (globalThis.window as unknown as { scrollY: number }).scrollY = 500;
    windowEvents.dispatch('scroll');

    const readRequests = mockFetch.mock.calls.filter(
      (call) => call[0] === 'https://api.example.com/litetrack/v1/track/read-progress',
    );

    expect(readRequests).toHaveLength(4);
    expect(JSON.parse((readRequests[2]?.[1] as { body: string }).body)).toMatchObject({
      path: '/posts/next',
      maxDepth: 25,
      visitorId: 'visitor-1',
      sessionId: expect.any(String),
    });
    expect(JSON.parse((readRequests[3]?.[1] as { body: string }).body)).toMatchObject({
      path: '/posts/next',
      maxDepth: 50,
      visitorId: 'visitor-1',
      sessionId: expect.any(String),
    });
  });

  it('uses in-memory identity fallback when storage is unavailable', () => {
    globalThis.localStorage = undefined as unknown as Storage;
    globalThis.sessionStorage = undefined as unknown as Storage;

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
    });

    tracker.page({
      path: '/memory',
      title: 'Memory Mode',
    });
    tracker.read({
      path: '/memory',
      percent: 80,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(getJsonBody(0)).toMatchObject({
      path: '/memory',
      title: 'Memory Mode',
      visitorId: expect.stringMatching(/^ltv_/),
      sessionId: expect.stringMatching(/^lts_/),
    });
    expect(getJsonBody(1)).toMatchObject({
      path: '/memory',
      maxDepth: 80,
      visitorId: expect.stringMatching(/^ltv_/),
      sessionId: expect.stringMatching(/^lts_/),
    });
  });

  it('reports request failures through onError for fire-and-forget methods', async () => {
    const errors: LiteTrackError[] = [];
    mockFetch.mockRejectedValue(new Error('Network error'));

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
      onError(error) {
        errors.push(error);
      },
    });

    tracker.page({
      path: '/error',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('NETWORK_ERROR');
  });

  it('only flushes read progress on visibilitychange when document becomes hidden', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoReadProgress: true,
      autoPageview: false,
      identity: {
        visitorId: 'visitor-1',
      },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    Object.assign(globalThis.document, { visibilityState: 'visible' });
    documentEvents.dispatch('visibilitychange');

    expect(mockFetch).toHaveBeenCalledTimes(1);

    (globalThis.window as unknown as { scrollY: number }).scrollY = 700;
    Object.assign(globalThis.document, { visibilityState: 'hidden' });
    documentEvents.dispatch('visibilitychange');

    expect(mockFetch).toHaveBeenCalledTimes(2);

    tracker.destroy();
  });

  it('supports manual page, read and identify calls', () => {
    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
      identity: {
        visitorId: 'visitor-1',
      },
    });

    tracker.identify({
      sessionId: 'session-2',
    });
    tracker.page({
      path: '/manual',
      title: '手动页面',
    });
    tracker.read(90);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      body: JSON.stringify({
        path: '/manual',
        title: '手动页面',
        visitorId: 'visitor-1',
        sessionId: 'session-2',
      }),
    });
    expect(mockFetch.mock.calls[1][1]).toMatchObject({
      body: JSON.stringify({
        path: '/manual',
        maxDepth: 90,
        visitorId: 'visitor-1',
        sessionId: 'session-2',
      }),
    });
  });
});

describe('stats', () => {
  it('queries site stats via tracker.stats.site()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalViews: 100,
        totalPages: 5,
      }),
    } as Response);

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
    });

    const result = await tracker.stats.site();

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/litetrack/v1/track/stats',
      {
        method: 'GET',
        headers: {
          'X-Site-Token': 'st_test',
        },
      },
    );
    expect(result).toEqual({
      totalViews: 100,
      totalPages: 5,
    });
  });

  it('queries page stats via tracker.stats.page()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        path: '/docs/start',
        count: 42,
      }),
    } as Response);

    const tracker = create({
      siteToken: 'st_test',
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
    });

    const result = await tracker.stats.page('docs/start/');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] ?? [];

    expect(url).toBe('https://api.example.com/litetrack/v1/track/stats?path=%2Fdocs%2Fstart');
    expect(result).toEqual({
      path: '/docs/start',
      count: 42,
    });
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
      baseUrl: 'https://api.example.com/litetrack/v1',
      autoPageview: false,
      autoReadProgress: false,
      onError(error) {
        errors.push(error);
      },
    });

    await expect(tracker.stats.site()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      status: 401,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('HTTP_ERROR');
  });
});
