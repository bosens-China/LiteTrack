<template>
  <el-card shadow="never" class="visitor-summary">
    <template #header>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <div class="panel-icon">
            <Icon icon="mdi:chart-timeline-variant" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">访客概览</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">关注独立访客规模、今日 UV 和最近趋势</div>
          </div>
        </div>
        <el-radio-group v-model="timeRange" size="small" class="shrink-0">
          <el-radio-button :value="'7'">7天</el-radio-button>
          <el-radio-button :value="'30'">30天</el-radio-button>
          <el-radio-button :value="'90'">90天</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="metric-card metric-card-sky">
        <div class="metric-card__label">
          <Icon icon="mdi:account-multiple-outline" class="text-base" />
          <span>区间 UV</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ formatNumber(summary.totalVisitors) }}</template>
          <el-skeleton-item v-else variant="text" style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">最近 {{ summary.days }} 天去重访客</p>
      </div>

      <div class="metric-card metric-card-emerald">
        <div class="metric-card__label">
          <Icon icon="mdi:calendar-today-outline" class="text-base" />
          <span>今日 UV</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ formatNumber(summary.todayVisitors) }}</template>
          <el-skeleton-item v-else variant="text" style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">按 {{ APP_TIMEZONE }} 当天归档</p>
      </div>

      <div class="metric-card metric-card-amber">
        <div class="metric-card__label">
          <Icon icon="mdi:sigma" class="text-base" />
          <span>日均 UV</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ formatNumber(averageVisitors) }}</template>
          <el-skeleton-item v-else variant="text" style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">峰值 {{ formatNumber(peakVisitors) }} / 天</p>
      </div>
    </div>

    <div class="visitor-summary__body">
      <div class="summary-note">
        <span>趋势明细</span>
        <span class="summary-note__meta">{{ chartDescription }}</span>
      </div>

      <!-- 空状态：el-empty 无 #icon 插槽，移除自定义图标 -->
      <el-empty
        v-if="!loading && dailyVisitors.length === 0"
        description="暂无访客数据"
        class="visitor-summary__empty"
      />

      <div v-else class="visitor-trend-list">
        <el-skeleton v-if="loading && dailyVisitors.length === 0" animated>
          <template #template>
            <div v-for="index in 6" :key="index" class="trend-row">
              <el-skeleton-item variant="text" style="width: 88px" />
              <el-skeleton-item variant="rect" style="height: 10px; flex: 1" />
              <el-skeleton-item variant="text" style="width: 40px" />
            </div>
          </template>
        </el-skeleton>

        <template v-else>
          <div v-for="item in dailyVisitors" :key="item.date" class="trend-row">
            <div class="trend-row__date">
              <span>{{ formatDateMD(item.date) }}</span>
              <span class="trend-row__full-date">{{ item.date }}</span>
            </div>
            <div class="trend-row__bar-track">
              <div class="trend-row__bar-fill" :style="getBarStyle(item.count)" />
            </div>
            <span class="trend-row__count">{{ formatNumber(item.count) }}</span>
          </div>
        </template>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useRequest } from 'vue-request'
import { getVisitorsStats, type DailyView, type VisitorsStatsResponse } from '@/api/stats'
import { APP_TIMEZONE, formatDateMD, formatNumber } from '@/utils'

type TimeRangeValue = '7' | '30' | '90'

interface Props {
  siteId: number
}

const props = defineProps<Props>()

const timeRange = ref<TimeRangeValue>('30')
const visitors = ref<VisitorsStatsResponse | null>(null)

const { run: fetchVisitors, loading } = useRequest(
  async () => {
    const response = await getVisitorsStats(props.siteId, { days: Number(timeRange.value) })
    visitors.value = response
    return response
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(error instanceof Error ? error.message : '加载访客分析失败')
    },
  },
)

const summary = computed(() =>
  visitors.value?.summary ?? {
    totalVisitors: 0,
    todayVisitors: 0,
    days: Number(timeRange.value),
  },
)

const dailyVisitors = computed<DailyView[]>(() => visitors.value?.dailyVisitors ?? [])

const peakVisitors = computed(() => {
  return dailyVisitors.value.reduce((maxCount, item) => Math.max(maxCount, item.count), 0)
})

const averageVisitors = computed(() => {
  if (dailyVisitors.value.length === 0) {
    return 0
  }

  const total = dailyVisitors.value.reduce((sum, item) => sum + item.count, 0)
  return Math.round(total / dailyVisitors.value.length)
})

const chartDescription = computed(() => {
  if (dailyVisitors.value.length === 0) {
    return `最近 ${summary.value.days} 天暂无趋势样本`
  }

  return `共 ${dailyVisitors.value.length} 个归档日，便于对照异常峰值`
})

function getBarStyle(count: number): { width: string } {
  const width = peakVisitors.value > 0 ? Math.max((count / peakVisitors.value) * 100, 6) : 0
  return {
    width: `${Math.min(width, 100)}%`,
  }
}

watch(
  [() => props.siteId, timeRange],
  () => {
    void fetchVisitors()
  },
  { immediate: true },
)
</script>

<style scoped>
.visitor-summary :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

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

.metric-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.82));
}

.metric-card::after {
  content: '';
  position: absolute;
  inset: auto -32px -42px auto;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  opacity: 0.45;
  pointer-events: none;
}

.metric-card-sky::after {
  background: radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 72%);
}

.metric-card-emerald::after {
  background: radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 72%);
}

.metric-card-amber::after {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.38), transparent 72%);
}

.metric-card__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.metric-card__value {
  margin-top: 0.75rem;
  color: var(--text-primary);
  font-size: 1.875rem;
  line-height: 1;
  font-weight: 700;
}

.metric-card__hint {
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.visitor-summary__body {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(248, 250, 252, 0.55);
  padding: 1rem;
}

.summary-note {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.summary-note__meta {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.visitor-summary__empty {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visitor-trend-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trend-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 56px;
  gap: 0.75rem;
  align-items: center;
}

.trend-row__date {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
}

.trend-row__full-date {
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 500;
}

.trend-row__bar-track {
  position: relative;
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
}

.trend-row__bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.9), rgba(59, 130, 246, 0.72));
}

.trend-row__count {
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 767px) {
  .summary-note {
    flex-direction: column;
  }

  .trend-row {
    grid-template-columns: 72px minmax(0, 1fr) 48px;
    gap: 0.5rem;
  }
}
</style>
