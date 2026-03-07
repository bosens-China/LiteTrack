import { ref, onUnmounted, type Ref } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'

/**
 * ECharts 组合式函数
 * 封装图表初始化、自动调整大小和销毁逻辑
 *
 * @example
 * const { chartRef, chartInstance, initChart, disposeChart } = useChart()
 *
 * onMounted(() => {
 *   initChart({
 *     xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
 *     yAxis: { type: 'value' },
 *     series: [{ data: [120, 200, 150], type: 'line' }]
 *   })
 * })
 */
export function useChart() {
  const chartRef = ref<HTMLDivElement | null>(null)
  const chartInstance = ref<ECharts | null>(null)

  /**
   * 初始化图表
   * @param option ECharts 配置选项
   * @param theme 主题（可选）
   */
  function initChart(option: EChartsOption, theme?: string) {
    if (!chartRef.value) return

    // 如果已存在实例，先销毁
    disposeChart()
    
    // 初始化实例并设置配置
    chartInstance.value = echarts.init(chartRef.value!, theme)
    chartInstance.value.setOption(option)
  }

  /**
   * 更新图表选项
   * @param option 新的配置选项
   * @param notMerge 是否不跟之前设置的 option 进行合并，默认为 false，即合并
   */
  function setOption(option: EChartsOption, notMerge?: boolean) {
    chartInstance.value?.setOption(option, notMerge)
  }

  /**
   * 调整图表大小
   */
  function resizeChart() {
    chartInstance.value?.resize()
  }

  /**
   * 销毁图表实例
   */
  function disposeChart() {
    if (chartInstance.value) {
      chartInstance.value.dispose()
      chartInstance.value = null
    }
  }

  /**
   * 监听窗口大小变化自动调整图表
   * @param immediate 是否立即执行一次 resize，默认为 true
   */
  function autoResize(immediate = true) {
    const handleResize = () => resizeChart()
    window.addEventListener('resize', handleResize)

    if (immediate) {
      resizeChart()
    }

    // 返回清理函数，方便在 onUnmounted 中调用
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }

  // 组件卸载时自动清理
  onUnmounted(() => {
    disposeChart()
  })

  return {
    chartRef,
    chartInstance: chartInstance as Ref<ECharts | null>,
    initChart,
    setOption,
    resizeChart,
    disposeChart,
    autoResize,
  }
}

export type UseChartReturn = ReturnType<typeof useChart>
