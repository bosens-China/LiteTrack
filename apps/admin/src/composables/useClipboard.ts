import { ref, type Ref } from 'vue'

export interface UseClipboardOptions {
  /** 复制成功后的回调 */
  onSuccess?: (text: string) => void
  /** 复制失败后的回调 */
  onError?: (error: Error) => void
}

/**
 * 剪贴板操作组合式函数
 * 封装复制文本到剪贴板的功能
 *
 * @example
 * const { copied, copy, isSupported } = useClipboard()
 *
 * // 在模板中使用
 * <button @click="copy('要复制的文本')">
 *   {{ copied ? '已复制' : '复制' }}
 * </button>
 *
 * @example
 * // 带回调的使用方式
 * const { copy } = useClipboard({
 *   onSuccess: (text) => message.success(`已复制: ${text}`),
 *   onError: (err) => message.error('复制失败')
 * })
 */
export function useClipboard(options: UseClipboardOptions = {}) {
  const copied = ref(false)
  const isSupported = ref(typeof navigator !== 'undefined' && 'clipboard' in navigator)

  /**
   * 复制文本到剪贴板
   * @param text 要复制的文本
   */
  async function copy(text: string): Promise<boolean> {
    if (!isSupported.value) {
      const error = new Error('浏览器不支持剪贴板 API')
      options.onError?.(error)
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      copied.value = true

      // 2 秒后重置 copied 状态
      setTimeout(() => {
        copied.value = false
      }, 2000)

      options.onSuccess?.(text)
      return true
    } catch (err) {
      copied.value = false
      const error = err instanceof Error ? err : new Error('复制失败')
      options.onError?.(error)
      return false
    }
  }

  return {
    copied: copied as Ref<boolean>,
    isSupported: isSupported as Ref<boolean>,
    copy,
  }
}

export type UseClipboardReturn = ReturnType<typeof useClipboard>
