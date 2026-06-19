<template>
  <el-card shadow="never">
    <template #header>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2">
          <div class="panel-icon">
            <Icon icon="mdi:chart-areaspline" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">访问趋势</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">默认查看最近 7 天访问量变化</div>
          </div>
        </div>
        <el-radio-group v-model="timeRange" size="small" class="shrink-0">
          <el-radio-button :value="'7'">7天</el-radio-button>
          <el-radio-button :value="'30'">30天</el-radio-button>
          <el-radio-button :value="'90'">3个月</el-radio-button>
          <el-radio-button :value="'365'">1年</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <!-- 固定高度，避免父级 flex 链无高度导致 ECharts 画布为 0 -->
    <div class="relative w-full h-[340px]">
      <v-chart
        :option="chartOption"
        :loading="loading"
        :loading-options="loadingOptions"
        :autoresize="true"
        class="absolute inset-0 w-full h-full min-h-[280px]"
      />
    </div>
  </el-card>
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

<style scoped>
.panel-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
