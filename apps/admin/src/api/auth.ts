import request from './request'

export interface User {
  id: number
  username: string
  avatar: string | null
  email: string | null
  createdAt: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const POST_LOGIN_REDIRECT_STORAGE_KEY = 'litetrack:post-login-redirect'
export const OAUTH_STATE_STORAGE_KEY = 'litetrack:oauth-state'

/**
 * GitHub OAuth 回调登录
 * @param code GitHub 返回的授权码
 */
export function loginWithGithub(code: string, state: string): Promise<LoginResponse> {
  return request.get('/auth/github/callback', {
    params: { code, state },
  }) as Promise<LoginResponse>
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser(): Promise<{ user: User }> {
  return request.get('/auth/me') as Promise<{ user: User }>
}

/**
 * GitHub OAuth 登录地址
 */
export const GITHUB_LOGIN_URL = `${import.meta.env.PUBLIC_API_BASE_URL || '/litetrack/v1'}/auth/github`

export function createOAuthState(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function buildGithubLoginUrl(state: string): string {
  const url = new URL(GITHUB_LOGIN_URL, window.location.origin)
  url.searchParams.set('state', state)
  return url.toString()
}
