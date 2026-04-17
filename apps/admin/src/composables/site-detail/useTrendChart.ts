import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useRequest } from 'vue-request'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components'
import { getTrend, type DailyView } from '@/api/stats'
import { buildTrendChartOption } from './trend-chart-options'
import {
  fillMissingData,
  fillMonthlyData,
  fillWeeklyData,
  type TrendRangeValue,
  type WeeklyMeta,
} from './trend-chart-data'

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
])
export function useTrendChart(siteId: () => number) {
  const message = useMessage()
  const timeRange = ref<TrendRangeValue>('7')
  const chartData = ref<DailyView[]>([])
  const weeklyMeta = ref<Map<string, WeeklyMeta>>(new Map())

  const xAxisData = computed(() => {
    if (timeRange.value === '365') {
      return fillMonthlyData(chartData.value).map((item) => item.label)
    }

    if (timeRange.value === '90') {
      return fillWeeklyData(chartData.value).map((item) => item.label)
    }

    return chartData.value.map((item) => item.date.slice(5))
  })

  const seriesData = computed(() => {
    if (timeRange.value === '365') {
      return fillMonthlyData(chartData.value).map((item) => item.count)
    }

    if (timeRange.value === '90') {
      return fillWeeklyData(chartData.value).map((item) => item.count)
    }

    return chartData.value.map((item) => item.count)
  })

  const chartOption = computed(() =>
    buildTrendChartOption({
      timeRange: timeRange.value,
      xAxisData: xAxisData.value,
      seriesData: seriesData.value,
      weeklyMeta: weeklyMeta.value,
    }),
  )

  const loadingOptions = {
    text: '加载中...',
    color: '#3B82F6',
    textColor: '#4F6785',
    maskColor: 'rgba(255, 255, 255, 0.75)',
    zlevel: 0,
  }

  function updateWeeklyMeta() {
    if (timeRange.value !== '90') {
      weeklyMeta.value.clear()
      return
    }

    const nextMeta = new Map<string, WeeklyMeta>()
    fillWeeklyData(chartData.value).forEach((item) => {
      nextMeta.set(item.label, item.range)
    })
    weeklyMeta.value = nextMeta
  }

  const { run: fetchTrendData, loading } = useRequest(
    async () => {
      const { dailyViews } = await getTrend(siteId(), Number(timeRange.value))
      chartData.value = fillMissingData(dailyViews, Number(timeRange.value))
      updateWeeklyMeta()
    },
    {
      manual: true,
      onError: (error) => {
        message.error(error instanceof Error ? error.message : '加载趋势数据失败')
      },
    },
  )

  watch(
    [siteId, timeRange],
    () => {
      void fetchTrendData()
    },
    { immediate: true },
  )

  return {
    chartOption,
    loading,
    loadingOptions,
    timeRange,
  }
}
