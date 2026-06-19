<template>
  <el-row :gutter="16">
    <el-col v-for="card in cards" :key="card.key" :xs="24" :sm="8">
      <el-card shadow="never" class="stat-card">
        <el-skeleton v-if="loading" animated :rows="2" />
        <template v-else>
          <div class="flex items-center gap-2 mb-3">
            <div class="stat-icon" :class="card.iconClass">
              <Icon :icon="card.icon" class="text-lg" />
            </div>
            <span style="font-size: 13px; color: var(--el-text-color-secondary)">{{ card.label }}</span>
          </div>
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-extra">{{ card.extra }}</div>
        </template>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { SiteStats } from '@/api/stats'

interface Props {
  stats: SiteStats | null
  todayViews: number
  loading?: boolean
}

const props = defineProps<Props>()

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const cards = computed(() => [
  {
    key: 'total',
    label: '总访问量',
    value: formatNumber(props.stats?.summary.totalViews ?? 0),
    extra: '累计数据',
    icon: 'mdi:chart-line',
    iconClass: 'icon-primary',
  },
  {
    key: 'pages',
    label: '页面数',
    value: formatNumber(props.stats?.summary.totalPages ?? 0),
    extra: '已追踪页面',
    icon: 'mdi:file-document-outline',
    iconClass: 'icon-success',
  },
  {
    key: 'today',
    label: '今日访问',
    value: formatNumber(props.todayViews),
    extra: '实时统计',
    icon: 'mdi:calendar-today',
    iconClass: 'icon-info',
  },
])
</script>

<style scoped>
.stat-card {
  margin-bottom: 16px;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-primary {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.icon-success {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.icon-info {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  font-family: 'Fira Code', monospace;
  letter-spacing: -0.02em;
}

.stat-extra {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

@media (min-width: 576px) {
  .stat-card {
    margin-bottom: 0;
  }
}
</style>
