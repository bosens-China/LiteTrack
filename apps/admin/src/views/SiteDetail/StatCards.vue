<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
    <div class="glass-card glass-card-blue p-5">
      <div class="flex items-center justify-between relative z-10">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Icon icon="mdi:chart-line" class="text-lg" />
            </div>
            <span class="stat-label">总访问量</span>
          </div>
          <p class="stat-value text-3xl xl:text-4xl text-[var(--text-primary)]">
            <template v-if="!loading">{{ formatNumber(stats?.summary.totalViews || 0) }}</template>
            <n-skeleton v-else text style="width: 60%; height: 36px" />
          </p>
          <p v-if="!loading" class="text-sm text-blue-700 mt-1 flex items-center gap-1">
            <Icon icon="mdi:trending-up" class="text-xs" />
            累计数据
          </p>
        </div>
      </div>
    </div>

    <div class="glass-card glass-card-emerald p-5">
      <div class="flex items-center justify-between relative z-10">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Icon icon="mdi:file-document-outline" class="text-lg" />
            </div>
            <span class="stat-label">页面数</span>
          </div>
          <p class="stat-value text-3xl xl:text-4xl text-[var(--text-primary)]">
            <template v-if="!loading">{{ formatNumber(stats?.summary.totalPages || 0) }}</template>
            <n-skeleton v-else text style="width: 60%; height: 36px" />
          </p>
          <p v-if="!loading" class="text-sm text-emerald-700 mt-1 flex items-center gap-1">
            <Icon icon="mdi:layers" class="text-xs" />
            已追踪页面
          </p>
        </div>
      </div>
    </div>

    <div class="glass-card glass-card-violet p-5">
      <div class="flex items-center justify-between relative z-10">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Icon icon="mdi:calendar-today" class="text-lg" />
            </div>
            <span class="stat-label">今日访问</span>
          </div>
          <p class="stat-value text-3xl xl:text-4xl text-[var(--text-primary)]">
            <template v-if="!loading">{{ formatNumber(todayViews) }}</template>
            <n-skeleton v-else text style="width: 60%; height: 36px" />
          </p>
          <p v-if="!loading" class="text-sm text-indigo-700 mt-1 flex items-center gap-1">
            <Icon icon="mdi:lightning-bolt" class="text-xs" />
            实时统计
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NSkeleton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import type { SiteStats } from '@/api/stats'

interface Props {
  stats: SiteStats | null
  todayViews: number
  loading?: boolean
}

defineProps<Props>()

// 格式化数字，添加千分位
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}
</script>
