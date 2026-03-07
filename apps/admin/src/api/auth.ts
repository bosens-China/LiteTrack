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

/**
 * GitHub OAuth 回调登录
 * @param code GitHub 返回的授权码
 */
export function loginWithGithub(code: string): Promise<LoginResponse> {
  return request.get('/auth/github/callback', { params: { code } }) as Promise<LoginResponse>
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
export const GITHUB_LOGIN_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/litetrack/v1'}/auth/github`
