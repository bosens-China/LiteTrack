export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

/**
 * 校验请求的 Origin 是否与站点注册域名匹配。
 * 浏览器发起跨域 POST 时必然携带 Origin 头，服务端不可伪造。
 * Origin 缺失时放行（curl、SSR 等合法场景），"null" 时同样放行（隐私模式）。
 */
export function validateOrigin(
  siteDomain: string,
  origin: string | undefined,
): boolean {
  if (!origin || origin === 'null') return true;
  try {
    const requestHost = new URL(origin).hostname.replace(/^www\./, '');
    const allowedHost = siteDomain.replace(/^www\./, '');
    return requestHost === allowedHost;
  } catch {
    return false;
  }
}

export interface VisitorAgentInfo {
  browser: string;
  deviceType: DeviceType;
  os: string;
}

/** 访客地理信息（国家/城市），由反向代理注入的请求头解析 */
export interface VisitorGeoInfo {
  country: string | null;
  city: string | null;
}

/** Cloudflare 在无法识别归属地时回填的占位值，应视为未知 */
const UNKNOWN_COUNTRY_CODES = new Set(['XX', 'T1']);

function pickHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * 从反向代理（Cloudflare / Nginx 等）注入的请求头解析地理信息。
 * 本地直连或未经反代时这些头不存在，返回 null——不自带 GeoIP 库。
 *
 * - 国家：优先 `CF-IPCountry`（两位 ISO 码），其次 `X-Geo-Country`
 * - 城市：`X-Geo-City`（Cloudflare 免费版无城市头，需自建反代注入）
 *
 * ⚠️ 这些头由客户端可控，仅在**可信反代**后才有意义（与 IP 限流信任
 * `X-Forwarded-For` 同理）。`trustProxyHeaders` 为 false 时直接返回空，
 * 避免直连部署被任意客户端伪造头污染地理统计。反代须剥离入站的同名头。
 */
export function parseGeoHeaders(
  headers: Record<string, string | string[] | undefined>,
  trustProxyHeaders: boolean,
): VisitorGeoInfo {
  if (!trustProxyHeaders) {
    return { country: null, city: null };
  }

  const rawCountry = (
    pickHeader(headers['cf-ipcountry']) ??
    pickHeader(headers['x-geo-country']) ??
    ''
  )
    .trim()
    .toUpperCase();
  const country =
    rawCountry && !UNKNOWN_COUNTRY_CODES.has(rawCountry) ? rawCountry : null;

  const rawCity = (pickHeader(headers['x-geo-city']) ?? '').trim();
  const city = rawCity || null;

  return { country, city };
}

function includesSome(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern));
}

export function parseUserAgent(
  userAgent: string | undefined,
): VisitorAgentInfo {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      deviceType: 'unknown',
      os: 'Unknown',
    };
  }

  const ua = userAgent.toLowerCase();

  const isBot = includesSome(ua, [
    'bot',
    'spider',
    'crawler',
    'slurp',
    'headless',
  ]);
  if (isBot) {
    return {
      browser: 'Bot',
      deviceType: 'bot',
      os: 'Unknown',
    };
  }

  let browser = 'Other';
  if (ua.includes('micromessenger')) {
    browser = 'WeChat';
  } else if (ua.includes('edg/')) {
    browser = 'Edge';
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  }

  let os = 'Other';
  if (includesSome(ua, ['iphone', 'ipad', 'ipod'])) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (includesSome(ua, ['mac os', 'macintosh'])) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }

  let deviceType: DeviceType = 'desktop';
  if (ua.includes('ipad') || ua.includes('tablet')) {
    deviceType = 'tablet';
  } else if (
    includesSome(ua, ['iphone', 'ipod', 'mobile']) ||
    (ua.includes('android') && !ua.includes('tablet'))
  ) {
    deviceType = 'mobile';
  } else if (browser === 'Other' && os === 'Other') {
    deviceType = 'unknown';
  }

  return {
    browser,
    deviceType,
    os,
  };
}
