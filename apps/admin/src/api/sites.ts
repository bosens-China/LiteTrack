import request from './request'

export interface Site {
  id: number
  userId: number
  domain: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    tokens: number
  }
}

export interface SiteToken {
  id: number
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  token?: string
}

// 用于列表显示的令牌（不包含 token 字符串）
export type SiteTokenMeta = Omit<SiteToken, 'token'>

export interface SiteDetail extends Site {
  tokens: Omit<SiteToken, 'token'>[]
}

export interface CreateSiteData {
  domain: string
  title?: string
  description?: string
}

export interface UpdateSiteData {
  title?: string
  description?: string
}

export function getSites(): Promise<{ sites: Site[] }> {
  return request.get('/sites') as Promise<{ sites: Site[] }>
}

export function createSite(data: CreateSiteData): Promise<{ site: Site; token: string }> {
  return request.post('/sites', data) as Promise<{ site: Site; token: string }>
}

export function getSite(id: number): Promise<{ site: SiteDetail }> {
  return request.get(`/sites/${id}`) as Promise<{ site: SiteDetail }>
}

export function updateSite(id: number, data: UpdateSiteData): Promise<{ site: Site }> {
  return request.patch(`/sites/${id}`, data) as Promise<{ site: Site }>
}

export function deleteSite(id: number): Promise<{ success: boolean }> {
  return request.delete(`/sites/${id}`) as Promise<{ success: boolean }>
}

export function createToken(
  siteId: number,
  data: { name: string; description?: string }
): Promise<{ token: SiteToken }> {
  return request.post(`/sites/${siteId}/tokens`, data) as Promise<{ token: SiteToken }>
}

export function deleteToken(siteId: number, tokenId: number): Promise<{ success: boolean }> {
  return request.delete(`/sites/${siteId}/tokens/${tokenId}`) as Promise<{ success: boolean }>
}
