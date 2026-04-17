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

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeMilestones(values: readonly number[]): number[] {
  return [...values]
    .map((value) => clampPercent(value))
    .filter((value, index, items) => items.indexOf(value) === index)
    .sort((left, right) => left - right);
}

export function getReadPercent(): number {
  if (!isBrowser()) {
    return 0;
  }

  const body = document.body;
  const documentElement = document.documentElement;

  const viewportHeight = window.innerHeight || documentElement?.clientHeight || 0;
  const documentHeight = Math.max(
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
    documentElement?.scrollHeight ?? 0,
    documentElement?.offsetHeight ?? 0,
    documentElement?.clientHeight ?? 0,
  );

  if (documentHeight <= viewportHeight) {
    return 100;
  }

  const scrollTop =
    window.scrollY ||
    documentElement?.scrollTop ||
    body?.scrollTop ||
    0;

  return clampPercent(((scrollTop + viewportHeight) / documentHeight) * 100);
}

export function isDocumentHidden(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return document.visibilityState === 'hidden';
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
