/**
 * 工具函数库
 */

/**
 * 获取今天的日期字符串（YYYY-MM-DD）
 */
export function getTodayString(): string {
  return new Date().toLocaleDateString('sv-SE')
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
