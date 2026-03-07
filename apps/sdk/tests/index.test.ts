import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { track, getSiteStats, getPageStats } from '../src/index'

const mockFetch = vi.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  // 在每个用例前重置 fetch 为 mock
  globalThis.fetch = mockFetch as unknown as typeof fetch
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({ ok: true } as Response)
})

afterEach(() => {
  // 还原全局 fetch
  globalThis.fetch = originalFetch
  vi.clearAllMocks()
})

describe('track', () => {

  it('should send correct request with token in header', () => {
    track('test-token', '/home')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.litetrack.io/litetrack/v1/track',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Token': 'test-token',
        },
        body: JSON.stringify({ path: '/home' }),
        keepalive: true,
      }
    )
  })

  it('should use custom apiUrl when provided', () => {
    const customUrl = 'https://custom.api.com/track'
    track('test-token', '/about', customUrl)

    expect(mockFetch).toHaveBeenCalledWith(
      customUrl,
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should handle special characters in path', () => {
    track('test-token', '/blog/hello-world?foo=bar&baz=qux')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ path: '/blog/hello-world?foo=bar&baz=qux' }),
      })
    )
  })

  it('should handle empty token gracefully', () => {
    // 空 token 也会发起请求，由后端验证
    track('', '/home')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Site-Token': '',
        }),
      })
    )
  })

  it('should handle empty path gracefully', () => {
    track('test-token', '')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ path: '' }),
      })
    )
  })

  it('should not throw when fetch fails', () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    expect(() => track('test-token', '/home')).not.toThrow()
  })
})

describe('getSiteStats', () => {
  it('should fetch site stats without path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalViews: 100,
        totalPages: 5,
      }),
    } as Response)

    const result = await getSiteStats('test-token')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.litetrack.io/litetrack/v1/track/stats',
      {
        method: 'GET',
        headers: {
          'X-Site-Token': 'test-token',
        },
      }
    )

    expect(result).toEqual({
      totalViews: 100,
      totalPages: 5,
    })
  })

  it('should return null when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const result = await getSiteStats('test-token')

    expect(result).toBeNull()
  })
})

describe('getPageStats', () => {
  it('should fetch page stats with path query', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        path: '/home',
        count: 42,
      }),
    } as Response)

    const result = await getPageStats('test-token', '/home')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]

    expect(typeof url).toBe('string')
    expect((url as string)).toContain('/track/stats')
    expect((url as string)).toContain('path=%2Fhome')
    expect(options).toMatchObject({
      method: 'GET',
      headers: {
        'X-Site-Token': 'test-token',
      },
    })

    expect(result).toEqual({
      path: '/home',
      count: 42,
    })
  })

  it('should return null when response not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response)

    const result = await getPageStats('test-token', '/home')

    expect(result).toBeNull()
  })
})
