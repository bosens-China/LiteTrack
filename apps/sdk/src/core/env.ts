export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function normalizePath(path: string): string {
  const trimmed = path.trim();

  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }

  return withLeadingSlash;
}

export function getCurrentPath(): string {
  if (!isBrowser() || typeof window.location?.pathname !== 'string') {
    return '/';
  }

  return normalizePath(window.location.pathname || '/');
}

export function getPageTitle(override?: string): string | undefined {
  if (override !== undefined) {
    const normalized = override.trim();
    return normalized || undefined;
  }

  if (!isBrowser()) {
    return undefined;
  }

  const title = document.title.trim();
  return title || undefined;
}

export function buildApiUrl(
  baseUrl: string,
  endpoint: string,
  query?: Record<string, string>,
): string {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}${endpoint}`);

  if (!query) {
    return url.toString();
  }

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}
