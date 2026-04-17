import type { EChartsOption } from 'echarts'
import type { TrendRangeValue, WeeklyMeta } from './trend-chart-data'

interface BuildTrendChartOptionInput {
  timeRange: TrendRangeValue
  xAxisData: string[]
  seriesData: number[]
  weeklyMeta: Map<string, WeeklyMeta>
}

export function buildTrendChartOption({
  timeRange,
  xAxisData,
  seriesData,
  weeklyMeta,
}: BuildTrendChartOptionInput): EChartsOption {
  const isSevenDays = timeRange === '7'

  return {
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: {
        color: '#F1F5F9',
        fontSize: 13,
      },
      extraCssText:
        'backdrop-filter: blur(10px); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);',
      formatter: (params) => formatTooltip(params, timeRange, weeklyMeta),
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          type: 'dashed',
        },
      },
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      boundaryGap: false,
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.2)',
        },
      },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 11,
        margin: 12,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      name: '访问量',
      nameTextStyle: {
        color: '#64748B',
        padding: [0, 0, 0, -10],
        fontSize: 11,
      },
      axisLine: {
        show: false,
      },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
        fontFamily: 'JetBrains Mono',
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.1)',
          type: 'dashed',
        },
      },
    },
    dataZoom: isSevenDays
      ? []
      : [
          {
            type: 'inside',
            start: 0,
            end: 100,
          },
          {
            type: 'slider',
            start: 0,
            end: 100,
            height: 16,
            bottom: 0,
            borderColor: 'transparent',
            backgroundColor: 'rgba(148, 163, 184, 0.1)',
            fillerColor: 'rgba(59, 130, 246, 0.2)',
            handleStyle: {
              color: '#3B82F6',
              shadowBlur: 3,
              shadowColor: 'rgba(0, 0, 0, 0.6)',
              shadowOffsetX: 2,
              shadowOffsetY: 2,
            },
            textStyle: {
              color: '#64748B',
            },
          },
        ],
    series: [
      {
        name: '访问量',
        data: seriesData,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbolSize: 8,
        emphasis: {
          focus: 'series',
          itemStyle: {
            color: '#60A5FA',
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
            shadowBlur: 10,
          },
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
              { offset: 0.5, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' },
            ],
          },
        },
        lineStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#60A5FA' },
              { offset: 0.5, color: '#3B82F6' },
              { offset: 1, color: '#8B5CF6' },
            ],
          },
          width: 3,
          shadowColor: 'rgba(59, 130, 246, 0.5)',
          shadowBlur: 10,
        },
        itemStyle: {
          color: '#3B82F6',
          borderColor: '#fff',
          borderWidth: 2,
        },
      },
    ],
    grid: {
      left: '2%',
      right: '3%',
      bottom: isSevenDays ? '2%' : '12%',
      top: '12%',
      containLabel: true,
    },
  }
}

function formatTooltip(
  params: unknown,
  timeRange: TrendRangeValue,
  weeklyMeta: Map<string, WeeklyMeta>,
): string {
  if (!Array.isArray(params) || params.length === 0) {
    return ''
  }

  const current = params[0]
  if (!isTooltipParam(current)) {
    return ''
  }

  const label = current.name
  const count = current.value

  if (timeRange === '90') {
    const range = weeklyMeta.get(label)
    if (range) {
      return `<div style="font-weight: 600; margin-bottom: 4px;">${label}</div>
        <div style="color: #94A3B8; font-size: 12px; margin-bottom: 8px;">${range.start} ~ ${range.end}</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: inline-block; width: 8px; height: 8px; background: #3B82F6; border-radius: 50%;"></span>
          <span style="color: #60A5FA; font-weight: 500;">${count}</span>
          <span style="color: #64748B;">次访问</span>
        </div>`
    }
  }

  return `<div style="font-weight: 600; margin-bottom: 4px;">${label}</div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="display: inline-block; width: 8px; height: 8px; background: #3B82F6; border-radius: 50%;"></span>
      <span style="color: #60A5FA; font-weight: 500;">${count}</span>
      <span style="color: #64748B;">次访问</span>
    </div>`
}

function isTooltipParam(value: unknown): value is { name: string; value: string | number } {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === 'string' &&
    (typeof candidate.value === 'string' || typeof candidate.value === 'number')
  )
}
