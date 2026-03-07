/**
 * 通用类型定义
 */

/** API 错误响应 */
export interface ApiError {
  message: string
  code?: string
  status?: number
}

/** 分页参数 */
export interface PaginationParams {
  page?: number
  pageSize?: number
}

/** 分页响应 */
export interface PaginationResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 下拉选项 */
export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

/** 路由元信息 */
export interface RouteMeta {
  /** 是否公开页面（无需登录） */
  public?: boolean
  /** 页面标题 */
  title?: string
  /** 页面图标 */
  icon?: string
  /** 是否在菜单中隐藏 */
  hiddenInMenu?: boolean
}
