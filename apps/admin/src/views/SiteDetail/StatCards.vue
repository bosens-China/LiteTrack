<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <n-card class="hover-card stat-card-blue text-white">
      <div class="text-center">
        <p class="text-white/80 text-sm font-medium">总访问量</p>
        <p class="text-3xl font-bold text-white">{{ stats?.summary.totalViews || 0 }}</p>
      </div>
    </n-card>
    <n-card class="hover-card stat-card-green text-white">
      <div class="text-center">
        <p class="text-white/80 text-sm font-medium">页面数</p>
        <p class="text-3xl font-bold text-white">{{ stats?.summary.totalPages || 0 }}</p>
      </div>
    </n-card>
    <n-card class="hover-card stat-card-purple text-white">
      <div class="text-center">
        <p class="text-white/80 text-sm font-medium">今日访问</p>
        <p class="text-3xl font-bold text-white">{{ todayViews }}</p>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from 'naive-ui'
import type { SiteStats } from '@/api/stats'

interface Props {
  stats: SiteStats | null
  todayViews: number
}

defineProps<Props>()
</script>
