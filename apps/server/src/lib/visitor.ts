export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'

export interface VisitorAgentInfo {
  browser: string
  deviceType: DeviceType
  os: string
}

function includesSome(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern))
}

export function parseUserAgent(userAgent: string | undefined): VisitorAgentInfo {
  if (!userAgent) {
    return {
      browser: 'Unknown',
      deviceType: 'unknown',
      os: 'Unknown',
    }
  }

  const ua = userAgent.toLowerCase()

  const isBot = includesSome(ua, ['bot', 'spider', 'crawler', 'slurp', 'headless'])
  if (isBot) {
    return {
      browser: 'Bot',
      deviceType: 'bot',
      os: 'Unknown',
    }
  }

  let browser = 'Other'
  if (ua.includes('micromessenger')) {
    browser = 'WeChat'
  } else if (ua.includes('edg/')) {
    browser = 'Edge'
  } else if (ua.includes('firefox/')) {
    browser = 'Firefox'
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Chrome'
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari'
  }

  let os = 'Other'
  if (includesSome(ua, ['iphone', 'ipad', 'ipod'])) {
    os = 'iOS'
  } else if (ua.includes('android')) {
    os = 'Android'
  } else if (ua.includes('windows')) {
    os = 'Windows'
  } else if (includesSome(ua, ['mac os', 'macintosh'])) {
    os = 'macOS'
  } else if (ua.includes('linux')) {
    os = 'Linux'
  }

  let deviceType: DeviceType = 'desktop'
  if (ua.includes('ipad') || ua.includes('tablet')) {
    deviceType = 'tablet'
  } else if (
    includesSome(ua, ['iphone', 'ipod', 'mobile']) ||
    (ua.includes('android') && !ua.includes('tablet'))
  ) {
    deviceType = 'mobile'
  } else if (browser === 'Other' && os === 'Other') {
    deviceType = 'unknown'
  }

  return {
    browser,
    deviceType,
    os,
  }
}
