/**
 * 工具函数库
 */

export const APP_TIMEZONE = 'Asia/Shanghai'

/**
 * 获取指定时区的日期字符串（YYYY-MM-DD）
 */
export function getTodayString(timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date())
}

/**
 * 将日期格式化为指定时区 YYYY-MM-DD，避免 UTC 时区偏移
 */
export function formatLocalDate(value: number | Date, timeZone: string = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date(value))
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('zh-CN')
}

/**
 * 格式化日期（月-日）
 */
export function formatDateMD(date: string): string {
  return date.slice(5)
}

/**
 * 数字千分位格式化
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}
