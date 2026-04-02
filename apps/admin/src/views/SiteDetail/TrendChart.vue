<template>
  <div class="glass-card p-5 flex flex-col min-h-[400px]">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <Icon icon="mdi:chart-areaspline" class="text-lg" />
        </div>
        <div>
          <h3 class="panel-title">访问趋势</h3>
          <p class="panel-subtitle">默认查看最近 7 天访问量变化。</p>
        </div>
      </div>
      
      <n-radio-group v-model:value="timeRange" size="small" class="shrink-0">
        <n-radio-button value="7">7天</n-radio-button>
        <n-radio-button value="30">30天</n-radio-button>
        <n-radio-button value="90">3个月</n-radio-button>
        <n-radio-button value="365">1年</n-radio-button>
      </n-radio-group>
    </div>

    <!-- 固定高度，避免父级 flex 链无高度导致 ECharts 画布为 0 -->
    <div class="relative w-full h-[340px] shrink-0">
      <v-chart
        :option="chartOption"
        :loading="loading"
        :loading-options="loadingOptions"
        :autoresize="true"
        class="absolute inset-0 w-full h-full min-h-[280px]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { NRadioGroup, NRadioButton } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { useRequest } from 'vue-request';
import { useMessage } from 'naive-ui';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { getTrend } from '@/api/stats';
import type { DailyView } from '@/api/stats';

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
]);

const props = defineProps<{
  siteId: number;
}>()

const message = useMessage()

// 时间范围状态
const timeRange = ref('7');
const chartData = ref<DailyView[]>([]);

// 存储周元数据供 tooltip 使用
const weeklyMeta = ref<Map<string, { start: string; end: string }>>(new Map());

// 深色主题图表配置
const chartOption = computed<EChartsOption>(() => {
  const isSevenDays = timeRange.value === '7';
  
  return {
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut',
    
    // 深色主题 tooltip
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
      extraCssText: 'backdrop-filter: blur(10px); border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);',
      formatter: (params) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const param = params[0];
        const label = param.name;
        const count = param.value;

        // 90天视图下显示周范围
        if (timeRange.value === '90') {
          const range = weeklyMeta.value.get(label);
          if (range) {
            return `<div style="font-weight: 600; margin-bottom: 4px;">${label}</div>
                    <div style="color: #94A3B8; font-size: 12px; margin-bottom: 8px;">${range.start} ~ ${range.end}</div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="display: inline-block; width: 8px; height: 8px; background: #3B82F6; border-radius: 50%;"></span>
                      <span style="color: #60A5FA; font-weight: 500;">${count}</span>
                      <span style="color: #64748B;">次访问</span>
                    </div>`;
          }
        }

        return `<div style="font-weight: 600; margin-bottom: 4px;">${label}</div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: inline-block; width: 8px; height: 8px; background: #3B82F6; border-radius: 50%;"></span>
                  <span style="color: #60A5FA; font-weight: 500;">${count}</span>
                  <span style="color: #64748B;">次访问</span>
                </div>`;
      },
      axisPointer: {
        type: 'line',
        lineStyle: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          type: 'dashed'
        }
      },
    },
    
    // X轴配置
    xAxis: {
      type: 'category',
      data: xAxisData.value,
      boundaryGap: false,
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.2)'
        }
      },
      axisLabel: {
        color: '#94A3B8',
        fontSize: 11,
        margin: 12
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      }
    },
    
    // Y轴配置
    yAxis: { 
      type: 'value', 
      minInterval: 1,
      name: '访问量',
      nameTextStyle: {
        color: '#64748B',
        padding: [0, 0, 0, -10],
        fontSize: 11
      },
      axisLine: {
        show: false
      },
      axisLabel: {
        color: '#64748B',
        fontSize: 11,
        fontFamily: 'JetBrains Mono'
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: 'rgba(148, 163, 184, 0.1)',
          type: 'dashed'
        }
      }
    },
    
    // 数据缩放
    dataZoom: isSevenDays ? [] : [
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
          shadowOffsetY: 2
        },
        textStyle: {
          color: '#64748B'
        }
      },
    ],
    
    // 数据系列
    series: [
      {
        name: '访问量',
        data: seriesData.value,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbolSize: 8,
        emphasis: {
          focus: 'series',
          showSymbol: true,
          itemStyle: {
            color: '#60A5FA',
            borderColor: '#fff',
            borderWidth: 2,
            shadowColor: 'rgba(59, 130, 246, 0.5)',
            shadowBlur: 10
          }
        },
        // 霓虹渐变面积
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
        // 发光线条
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
            ]
          }, 
          width: 3,
          shadowColor: 'rgba(59, 130, 246, 0.5)',
          shadowBlur: 10
        },
        itemStyle: { 
          color: '#3B82F6',
          borderColor: '#fff',
          borderWidth: 2
        },
      },
    ],
    
    // 网格配置
    grid: {
      left: '2%',
      right: '3%',
      bottom: isSevenDays ? '2%' : '12%',
      top: '12%',
      containLabel: true,
    },
  };
});

// 加载配置
const loadingOptions = {
  text: '加载中...',
  color: '#3B82F6',
  textColor: '#4F6785',
  maskColor: 'rgba(255, 255, 255, 0.75)',
  zlevel: 0
};

// X轴数据
const xAxisData = computed(() => {
  if (timeRange.value === '365') {
    const monthlyData = fillMonthlyData(chartData.value);
    return monthlyData.map(d => d.label);
  } else if (timeRange.value === '90') {
    const weeklyData = fillWeeklyData(chartData.value);
    return weeklyData.map(d => d.label);
  } else {
    return chartData.value.map((d) => d.date.slice(5));
  }
});

// 系列数据
const seriesData = computed(() => {
  if (timeRange.value === '365') {
    const monthlyData = fillMonthlyData(chartData.value);
    return monthlyData.map(d => d.count);
  } else if (timeRange.value === '90') {
    const weeklyData = fillWeeklyData(chartData.value);
    return weeklyData.map(d => d.count);
  } else {
    return chartData.value.map((d) => d.count);
  }
});

// 更新周元数据（在数据变化时更新，不在 computed 中）
function updateWeeklyMeta() {
  if (timeRange.value === '90') {
    const weeklyData = fillWeeklyData(chartData.value);
    const meta = new Map<string, { start: string; end: string }>();
    weeklyData.forEach(d => {
      meta.set(d.label, d.range);
    });
    weeklyMeta.value = meta;
  }
}

// 使用 vue-request 管理请求
const { run: fetchTrendData, loading } = useRequest(
  async () => {
    const days = parseInt(timeRange.value, 10);
    const { dailyViews } = await getTrend(props.siteId, days);
    chartData.value = fillMissingData(dailyViews, days);
    // 更新周元数据（90天视图）
    updateWeeklyMeta();
  },
  {
    manual: true,
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '加载趋势数据失败')
    }
  }
);

/**
 * 补全缺失的数据
 */
function fillMissingData(rawData: DailyView[], days: number): DailyView[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dataMap = new Map<string, number>();
  rawData.forEach(d => {
    dataMap.set(d.date, d.count);
  });
  
  const result: DailyView[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('sv-SE');
    
    result.push({
      date: dateStr,
      count: dataMap.get(dateStr) || 0
    });
  }
  
  return result;
}

/**
 * 获取周的友好显示格式
 */
function getWeekLabel(d: Date): string {
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const weekOfMonth = Math.ceil(date / 7);
  return `${month}月第${weekOfMonth}周`;
}

/**
 * 获取周的起止日期范围
 */
function getWeekRange(monday: Date): { start: string; end: string } {
  const end = new Date(monday);
  end.setDate(monday.getDate() + 6);

  return {
    start: `${monday.getMonth() + 1}/${monday.getDate()}`,
    end: `${end.getMonth() + 1}/${end.getDate()}`,
  };
}

/**
 * 获取日期所在周的周一
 */
function getMonday(d: Date): Date {
  const day = d.getDay() || 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * 按月聚合数据
 */
function fillMonthlyData(rawData: DailyView[]): { label: string; count: number }[] {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 11);
  startDate.setDate(1);
  
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      break;
    }
    
    const label = year === currentYear ? `${month}月` : `${year}年${month}月`;
    months.push({ year, month, label });
  }
  
  const monthlyCounts = new Map<string, number>();
  rawData.forEach(d => {
    const monthKey = d.date.slice(0, 7);
    monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) || 0) + d.count);
  });
  
  return months.map(({ year, month, label }) => {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    return {
      label,
      count: monthlyCounts.get(monthKey) || 0
    };
  });
}

/**
 * 按周聚合数据
 */
function fillWeeklyData(rawData: DailyView[]): { label: string; count: number; range: { start: string; end: string } }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 89);
  const startMonday = getMonday(startDate);
  
  const endSunday = new Date(getMonday(today));
  endSunday.setDate(endSunday.getDate() + 6);
  
  const weeks: { monday: Date; label: string; range: { start: string; end: string } }[] = [];
  const currentMonday = new Date(startMonday);
  
  while (currentMonday <= endSunday) {
    weeks.push({
      monday: new Date(currentMonday),
      label: getWeekLabel(currentMonday),
      range: getWeekRange(currentMonday)
    });
    
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  const weeklyCounts = new Map<string, number>();
  rawData.forEach(d => {
    const dateObj = new Date(d.date);
    const monday = getMonday(dateObj);
    const weekKey = monday.toISOString().slice(0, 10);
    weeklyCounts.set(weekKey, (weeklyCounts.get(weekKey) || 0) + d.count);
  });
  
  return weeks.map(week => {
    const weekKey = week.monday.toISOString().slice(0, 10);
    return {
      label: week.label,
      count: weeklyCounts.get(weekKey) || 0,
      range: week.range
    };
  });
}

onMounted(() => {
  fetchTrendData();
});

watch(timeRange, () => {
  fetchTrendData();
});

watch(() => props.siteId, () => {
  fetchTrendData();
});
</script>
