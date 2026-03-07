import { watch, toRef } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

/**
 * 设置文档标题
 * @param title - 标题，可以是字符串、ref 或 getter 函数
 * @example
 * useDocumentTitle('Dashboard') // 字符串
 * useDocumentTitle(() => site.value?.name || 'Site') // getter
 * useDocumentTitle(computed(() => pageTitle.value)) // computed
 */
export function useDocumentTitle(title: MaybeRefOrGetter<string>) {
  watch(
    toRef(title),
    (t) => {
      document.title = t ? `${t} | LiteTrack` : 'LiteTrack'
    },
    { immediate: true }
  )
}
