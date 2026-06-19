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
      
      <!-- 时间范围切换：保持原 value 字符串类型不变 -->
      <el-radio-group v-model="timeRange" size="small" class="shrink-0">
        <el-radio-button :value="'7'">7天</el-radio-button>
        <el-radio-button :value="'30'">30天</el-radio-button>
        <el-radio-button :value="'90'">3个月</el-radio-button>
        <el-radio-button :value="'365'">1年</el-radio-button>
      </el-radio-group>
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
import { Icon } from '@iconify/vue'
import VChart from 'vue-echarts'
import { useTrendChart } from '@/composables/site-detail/useTrendChart'

const props = defineProps<{
  siteId: number
}>()

const { chartOption, loading, loadingOptions, timeRange } = useTrendChart(() => props.siteId)
</script>
