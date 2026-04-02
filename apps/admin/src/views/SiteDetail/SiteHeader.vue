<template>
  <div class="glass-card p-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Icon icon="mdi:web" class="text-xl" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {{ site.title || '未命名网站' }}
            </h1>
            <p class="text-[var(--text-secondary)] text-sm flex items-center gap-1.5">
              <Icon icon="mdi:link-variant" class="text-xs text-slate-400" />
              <span class="font-mono">{{ site.domain }}</span>
            </p>
          </div>
        </div>
        
        <p v-if="site.description" class="text-[var(--text-secondary)] mt-3 text-sm leading-relaxed max-w-2xl">
          {{ site.description }}
        </p>
        <p v-else class="text-[var(--text-muted)] mt-3 text-sm italic">
          暂无描述
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <button class="btn-glass px-4 py-2 rounded-lg text-sm" @click="$emit('edit')">
          <Icon icon="mdi:pencil" class="text-base" />
          编辑信息
        </button>
      </div>
    </div>

    <div class="mt-5 pt-5 border-t border-slate-200 flex flex-wrap items-center gap-6 text-sm">
      <div class="flex items-center gap-2 text-[var(--text-secondary)]">
        <Icon icon="mdi:calendar-plus" class="text-slate-400" />
        <span>创建于 {{ formatDate(site.createdAt) }}</span>
      </div>
      <div class="flex items-center gap-2 text-[var(--text-secondary)]">
        <Icon icon="mdi:sync" class="text-slate-400" />
        <span>更新于 {{ formatDate(site.updatedAt) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Icon icon="mdi:shield-check" class="text-emerald-600" />
        <span class="text-emerald-700 font-medium">运行中</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { SiteDetail } from '@/api/sites'

interface Props {
  site: SiteDetail
}

defineProps<Props>()

defineEmits<{
  edit: []
}>()

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>
