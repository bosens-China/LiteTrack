import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useRequest } from 'vue-request'
import { getReadingStats, type ReadingStatsResponse } from '@/api/stats'
import { formatNumber } from '@/utils'

export type ReadingRangeValue = '7' | '30' | '90'

interface DepthStep {
  label: string
  count: number
}

export function useReadingAnalytics(siteId: () => number) {
  const message = useMessage()
  const timeRange = ref<ReadingRangeValue>('30')
  const draftPath = ref('')
  const activePath = ref('')
  const readingStats = ref<ReadingStatsResponse | null>(null)

  const { run: fetchReadingStats, loading } = useRequest(
    async () => {
      const response = await getReadingStats(siteId(), {
        days: Number(timeRange.value),
        path: activePath.value || undefined,
      })

      readingStats.value = response
      return response
    },
    {
      manual: true,
      onError: (error) => {
        message.error(error instanceof Error ? error.message : '加载阅读分析失败')
      },
    },
  )

  const summary = computed(() =>
    readingStats.value?.summary ?? {
      path: activePath.value || null,
      days: Number(timeRange.value),
      totalReaders: 0,
      depth25Count: 0,
      depth50Count: 0,
      depth75Count: 0,
      depth100Count: 0,
      completionRate: 0,
      averageDepth: 0,
    },
  )

  const hasReadingStats = computed(() => readingStats.value !== null)
  const currentPath = computed(() => summary.value.path ?? '')
  const depthSteps = computed<DepthStep[]>(() => {
    const current = summary.value
    return [
      { label: '阅读 ≥ 25%', count: current.depth25Count },
      { label: '阅读 ≥ 50%', count: current.depth50Count },
      { label: '阅读 ≥ 75%', count: current.depth75Count },
      { label: '阅读 = 100%', count: current.depth100Count },
    ]
  })

  const maxDepthCount = computed(() => {
    return depthSteps.value.reduce((maxCount, step) => Math.max(maxCount, step.count), 0)
  })

  function getDepthStyle(count: number): { width: string } {
    const width = maxDepthCount.value > 0 ? Math.max((count / maxDepthCount.value) * 100, 8) : 0
    return {
      width: `${Math.min(width, 100)}%`,
    }
  }

  function applyPathFilter() {
    activePath.value = draftPath.value.trim()
    void fetchReadingStats()
  }

  function resetPathFilter() {
    draftPath.value = ''
    activePath.value = ''
    void fetchReadingStats()
  }

  function formatPercent(value: number): string {
    return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`
  }

  function formatDepth(value: number): string {
    return `${Number(value.toFixed(value % 1 === 0 ? 0 : 1))}%`
  }

  function formatDepthCount(count: number): string {
    if (summary.value.totalReaders === 0) {
      return formatNumber(count)
    }

    const ratio = ((count / summary.value.totalReaders) * 100).toFixed(
      count / summary.value.totalReaders >= 0.1 ? 0 : 1,
    )
    return `${formatNumber(count)} / ${ratio}%`
  }

  watch(
    [siteId, timeRange],
    () => {
      void fetchReadingStats()
    },
    { immediate: true },
  )

  return {
    applyPathFilter,
    currentPath,
    depthSteps,
    draftPath,
    formatDepth,
    formatDepthCount,
    formatPercent,
    getDepthStyle,
    hasReadingStats,
    loading,
    resetPathFilter,
    summary,
    timeRange,
  }
}
