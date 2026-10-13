import type {
  ApiEnvelope,
  DateRange,
  Metrics,
  PagesResult,
  ReferrerRow,
  Site,
  SiteInput,
  SiteSummary,
  SiteToken,
  TrendPoint,
  User,
  Dashboard,
} from '@litetrack/contracts';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/litetrack/api' + path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const result = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok)
    throw new ApiError(
      result.message || '请求失败，请稍后重试',
      response.status,
    );
  return result.data;
}
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const query = (range: DateRange) =>
  '?' + new URLSearchParams({ start: range.start, end: range.end });
export const getUser = (signal?: AbortSignal) =>
  request<User>('/auth/me', { signal });
export const logout = () => request<null>('/auth/logout', json('POST'));
export const getSites = (signal?: AbortSignal) =>
  request<SiteSummary[]>('/sites', { signal });
export const getDashboard = (range: DateRange, signal?: AbortSignal) =>
  request<Dashboard>('/sites/summary' + query(range), { signal });
export const getSite = (id: number, signal?: AbortSignal) =>
  request<Site>('/sites/' + id, { signal });
export const createSite = (input: SiteInput) =>
  request<Site>('/sites', json('POST', input));
export const updateSite = (id: number, input: SiteInput) =>
  request<Site>('/sites/' + id, json('PATCH', input));
export const deleteSite = (id: number) =>
  request<null>('/sites/' + id, json('DELETE'));
export const getOverview = (
  id: number,
  range: DateRange,
  signal?: AbortSignal,
) => request<Metrics>('/sites/' + id + '/overview' + query(range), { signal });
export const getTrend = (id: number, range: DateRange, signal?: AbortSignal) =>
  request<TrendPoint[]>('/sites/' + id + '/trend' + query(range), { signal });
export const getPages = (
  id: number,
  range: DateRange,
  page: number,
  signal?: AbortSignal,
) =>
  request<PagesResult>(
    '/sites/' + id + '/pages' + query(range) + '&page=' + page,
    { signal },
  );
export const getReferrers = (
  id: number,
  range: DateRange,
  signal?: AbortSignal,
) =>
  request<ReferrerRow[]>('/sites/' + id + '/referrers' + query(range), {
    signal,
  });
export const getTokens = (id: number, signal?: AbortSignal) =>
  request<SiteToken[]>('/sites/' + id + '/tokens', { signal });
export const createToken = (id: number, name: string) =>
  request<SiteToken>('/sites/' + id + '/tokens', json('POST', { name }));
export const toggleToken = (id: number, tokenId: number, isActive: boolean) =>
  request<null>(
    '/sites/' + id + '/tokens/' + tokenId,
    json('PATCH', { isActive }),
  );
export const deleteToken = (id: number, tokenId: number) =>
  request<null>('/sites/' + id + '/tokens/' + tokenId, json('DELETE'));
