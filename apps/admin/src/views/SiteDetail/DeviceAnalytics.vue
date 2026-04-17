<template>
  <section class="glass-card p-5 device-analytics">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
          <Icon icon="mdi:devices" class="text-lg" />
        </div>
        <div>
          <h3 class="panel-title">设备结构</h3>
          <p class="panel-subtitle">查看访问终端、浏览器与系统的分布情况。</p>
        </div>
      </div>

      <n-radio-group v-model:value="timeRange" size="small" class="shrink-0">
        <n-radio-button value="7">7天</n-radio-button>
        <n-radio-button value="30">30天</n-radio-button>
        <n-radio-button value="90">90天</n-radio-button>
      </n-radio-group>
    </div>

    <div class="device-analytics__meta">
      <span>最近 {{ summary.days }} 天</span>
      <span>样本日志 {{ formatNumber(totalSamples) }} 条</span>
    </div>

    <n-empty
      v-if="!loading && totalSamples === 0"
      description="暂无设备数据"
      class="device-analytics__empty"
    >
      <template #icon>
        <Icon icon="mdi:laptop-off" class="text-5xl text-slate-400" />
      </template>
    </n-empty>

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <article class="bucket-card">
        <div class="bucket-card__header">
          <span class="bucket-card__title">终端类型</span>
          <span class="bucket-card__tag">UV 线索</span>
        </div>
        <div class="bucket-list">
          <template v-if="loading && deviceTypes.length === 0">
            <div v-for="index in 4" :key="index" class="bucket-row bucket-row--loading">
              <n-skeleton text style="width: 40%" />
              <n-skeleton round style="height: 8px; flex: 1" />
            </div>
          </template>
          <template v-else>
            <div v-for="item in deviceTypes" :key="item.name" class="bucket-row">
              <div class="bucket-row__topline">
                <span class="bucket-row__name">{{ formatDeviceType(item.name) }}</span>
                <span class="bucket-row__value">{{ formatCountWithRatio(item.count) }}</span>
              </div>
              <div class="bucket-row__track">
                <div class="bucket-row__fill bucket-row__fill--violet" :style="getBarStyle(item.count)" />
              </div>
            </div>
          </template>
        </div>
      </article>

      <article class="bucket-card">
        <div class="bucket-card__header">
          <span class="bucket-card__title">浏览器</span>
          <span class="bucket-card__tag">Top {{ browsers.length }}</span>
        </div>
        <div class="bucket-list">
          <template v-if="loading && browsers.length === 0">
            <div v-for="index in 4" :key="index" class="bucket-row bucket-row--loading">
              <n-skeleton text style="width: 40%" />
              <n-skeleton round style="height: 8px; flex: 1" />
            </div>
          </template>
          <template v-else>
            <div v-for="item in browsers" :key="item.name" class="bucket-row">
              <div class="bucket-row__topline">
                <span class="bucket-row__name">{{ formatGenericName(item.name) }}</span>
                <span class="bucket-row__value">{{ formatCountWithRatio(item.count) }}</span>
              </div>
              <div class="bucket-row__track">
                <div class="bucket-row__fill bucket-row__fill--sky" :style="getBarStyle(item.count)" />
              </div>
            </div>
          </template>
        </div>
      </article>

      <article class="bucket-card">
        <div class="bucket-card__header">
          <span class="bucket-card__title">操作系统</span>
          <span class="bucket-card__tag">Top {{ operatingSystems.length }}</span>
        </div>
        <div class="bucket-list">
          <template v-if="loading && operatingSystems.length === 0">
            <div v-for="index in 4" :key="index" class="bucket-row bucket-row--loading">
              <n-skeleton text style="width: 40%" />
              <n-skeleton round style="height: 8px; flex: 1" />
            </div>
          </template>
          <template v-else>
            <div v-for="item in operatingSystems" :key="item.name" class="bucket-row">
              <div class="bucket-row__topline">
                <span class="bucket-row__name">{{ formatGenericName(item.name) }}</span>
                <span class="bucket-row__value">{{ formatCountWithRatio(item.count) }}</span>
              </div>
              <div class="bucket-row__track">
                <div class="bucket-row__fill bucket-row__fill--emerald" :style="getBarStyle(item.count)" />
              </div>
            </div>
          </template>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NEmpty, NRadioButton, NRadioGroup, NSkeleton, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useRequest } from 'vue-request'
import { getDeviceStats, type DeviceBucket, type DevicesStatsResponse } from '@/api/stats'
import { formatNumber } from '@/utils'

type TimeRangeValue = '7' | '30' | '90'

interface Props {
  siteId: number
}

const props = defineProps<Props>()
const message = useMessage()

const timeRange = ref<TimeRangeValue>('30')
const deviceStats = ref<DevicesStatsResponse | null>(null)

const { run: fetchDeviceStats, loading } = useRequest(
  async () => {
    const response = await getDeviceStats(props.siteId, { days: Number(timeRange.value) })
    deviceStats.value = response
    return response
  },
  {
    manual: true,
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '加载设备分析失败')
    },
  },
)

const summary = computed(() =>
  deviceStats.value?.summary ?? {
    days: Number(timeRange.value),
  },
)

const deviceTypes = computed<DeviceBucket[]>(() => deviceStats.value?.deviceTypes ?? [])
const browsers = computed<DeviceBucket[]>(() => deviceStats.value?.browsers ?? [])
const operatingSystems = computed<DeviceBucket[]>(() => deviceStats.value?.operatingSystems ?? [])

const totalSamples = computed(() => {
  return deviceTypes.value.reduce((sum, item) => sum + item.count, 0)
})

const maxBucketCount = computed(() => {
  return Math.max(
    ...deviceTypes.value.map((item) => item.count),
    ...browsers.value.map((item) => item.count),
    ...operatingSystems.value.map((item) => item.count),
    0,
  )
})

function getBarStyle(count: number): { width: string } {
  const width = maxBucketCount.value > 0 ? Math.max((count / maxBucketCount.value) * 100, 8) : 0
  return {
    width: `${Math.min(width, 100)}%`,
  }
}

function formatDeviceType(value: string): string {
  const labels: Record<string, string> = {
    desktop: '桌面端',
    mobile: '移动端',
    tablet: '平板',
    bot: '爬虫 / 机器人',
    unknown: '未知',
  }

  return labels[value.toLowerCase()] ?? formatGenericName(value)
}

function formatGenericName(value: string): string {
  const normalized = value.trim()
  if (!normalized || normalized.toLowerCase() === 'unknown') {
    return '未知'
  }

  if (normalized.toLowerCase() === 'other') {
    return '其他'
  }

  return normalized
}

function formatCountWithRatio(count: number): string {
  if (totalSamples.value === 0) {
    return `${formatNumber(count)}`
  }

  const ratio = ((count / totalSamples.value) * 100).toFixed(count / totalSamples.value >= 0.1 ? 0 : 1)
  return `${formatNumber(count)} / ${ratio}%`
}

watch(
  [() => props.siteId, timeRange],
  () => {
    void fetchDeviceStats()
  },
  { immediate: true },
)
</script>

<style scoped>
.device-analytics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
}

.device-analytics__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.device-analytics__empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bucket-card {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(248, 250, 252, 0.55);
}

.bucket-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.bucket-card__title {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.bucket-card__tag {
  color: var(--text-muted);
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
}

.bucket-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bucket-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.bucket-row--loading {
  gap: 0.625rem;
}

.bucket-row__topline {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.bucket-row__name {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  min-width: 0;
}

.bucket-row__value {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.bucket-row__track {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.bucket-row__fill {
  height: 100%;
  border-radius: 999px;
}

.bucket-row__fill--violet {
  background: linear-gradient(90deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.72));
}

.bucket-row__fill--sky {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.9), rgba(59, 130, 246, 0.72));
}

.bucket-row__fill--emerald {
  background: linear-gradient(90deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.72));
}

@media (max-width: 767px) {
  .device-analytics__meta {
    flex-direction: column;
  }
}
</style>
