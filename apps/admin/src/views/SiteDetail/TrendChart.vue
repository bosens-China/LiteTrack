<template>
  <n-card title="访问趋势（最近30天）">
    <div ref="chartRef" class="h-80"></div>
  </n-card>
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue';
import { NCard } from 'naive-ui';
import { useChart } from '@/composables';
import type { DailyView } from '@/api/stats';
import type { EChartsOption } from 'echarts';

interface Props {
  dailyViews: DailyView[];
}

const props = defineProps<Props>();

const { chartRef, initChart, setOption } = useChart();

function getOption(): EChartsOption {
  const dates = props.dailyViews.map((d) => d.date.slice(5));
  const counts = props.dailyViews.map((d) => d.count);

  return {
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      {
        data: counts,
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
      },
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
  };
}

function updateChart() {
  const option = getOption();
  setOption(option);
}

onMounted(() => {
  // 初始化时直接传入当前配置，避免异步竞态问题
  initChart(getOption());
});

watch(() => props.dailyViews, updateChart, { deep: true });
</script>
