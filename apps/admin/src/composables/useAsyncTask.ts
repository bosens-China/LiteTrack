import { ref, type Ref } from 'vue'

export interface UseAsyncTaskOptions<T> {
  /** 任务执行前的回调 */
  onBefore?: () => void
  /** 任务成功后的回调 */
  onSuccess?: (data: T) => void
  /** 任务失败后的回调 */
  onError?: (error: Error) => void
  /** 任务完成后的回调（无论成功与否） */
  onFinally?: () => void
  /** 是否立即执行，默认为 false */
  immediate?: boolean
}

/**
 * 异步任务管理组合式函数
 * 封装异步操作的状态管理（loading、error、data）
 *
 * @example
 * const { execute, loading, error, data } = useAsyncTask(async () => {
 *   const response = await fetchUser()
 *   return response.user
 * })
 *
 * // 在模板中使用
 * <button @click="execute" :disabled="loading">
 *   {{ loading ? '加载中...' : '获取用户' }}
 * </button>
 * <p v-if="error">{{ error.message }}</p>
 * <p v-if="data">{{ data.name }}</p>
 *
 * @example
 * // 带回调的使用方式
 * const { execute } = useAsyncTask(
 *   async () => await fetchSites(),
 *   {
 *     onSuccess: (sites) => message.success(`获取到 ${sites.length} 个网站`),
 *     onError: (err) => message.error(err.message)
 *   }
 * )
 */
export function useAsyncTask<T>(
  task: () => Promise<T>,
  options: UseAsyncTaskOptions<T> = {}
) {
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<T | null>(null)

  /**
   * 执行异步任务
   */
  async function execute(): Promise<T | null> {
    loading.value = true
    error.value = null
    options.onBefore?.()

    try {
      const result = await task()
      data.value = result
      options.onSuccess?.(result)
      return result
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err))
      error.value = errorInstance
      options.onError?.(errorInstance)
      return null
    } finally {
      loading.value = false
      options.onFinally?.()
    }
  }

  /**
   * 重置状态
   */
  function reset() {
    loading.value = false
    error.value = null
    data.value = null
  }

  // 如果设置了立即执行
  if (options.immediate) {
    execute()
  }

  return {
    loading: loading as Ref<boolean>,
    error: error as Ref<Error | null>,
    data: data as Ref<T | null>,
    execute,
    reset,
  }
}

export type UseAsyncTaskReturn<T> = ReturnType<typeof useAsyncTask<T>>
