<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <n-card class="stat-card-blue">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-600/80 text-sm font-medium">总访问量</p>
          <p class="text-2xl xl:text-3xl font-bold text-blue-700">
            <template v-if="!loading">{{ stats?.summary.totalViews || 0 }}</template>
            <n-skeleton v-else text style="width: 60%" />
          </p>
        </div>
        <Icon icon="mdi:chart-line" class="text-3xl xl:text-4xl text-blue-500" />
      </div>
    </n-card>
    <n-card class="stat-card-green">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-600/80 text-sm font-medium">页面数</p>
          <p class="text-2xl xl:text-3xl font-bold text-green-700">
            <template v-if="!loading">{{ stats?.summary.totalPages || 0 }}</template>
            <n-skeleton v-else text style="width: 60%" />
          </p>
        </div>
        <Icon icon="mdi:file-document-outline" class="text-3xl xl:text-4xl text-green-500" />
      </div>
    </n-card>
    <n-card class="stat-card-purple">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-600/80 text-sm font-medium">今日访问</p>
          <p class="text-2xl xl:text-3xl font-bold text-purple-700">
            <template v-if="!loading">{{ todayViews }}</template>
            <n-skeleton v-else text style="width: 60%" />
          </p>
        </div>
        <Icon icon="mdi:calendar-today" class="text-3xl xl:text-4xl text-purple-500" />
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard, NSkeleton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import type { SiteStats } from '@/api/stats'

interface Props {
  stats: SiteStats | null
  todayViews: number
  loading?: boolean
}

defineProps<Props>()
</script>
