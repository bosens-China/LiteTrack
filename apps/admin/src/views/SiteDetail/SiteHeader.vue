<template>
  <div class="glass-card p-6 relative overflow-hidden">
    <!-- 背景装饰渐变 -->
    <div class="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
    
    <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <!-- 左侧：网站信息 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Icon icon="mdi:web" class="text-xl text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight">
              {{ site.title || '未命名网站' }}
            </h1>
            <p class="text-slate-400 text-sm flex items-center gap-1.5">
              <Icon icon="mdi:link-variant" class="text-xs" />
              <span class="font-mono">{{ site.domain }}</span>
            </p>
          </div>
        </div>
        
        <p v-if="site.description" class="text-slate-400 mt-3 text-sm leading-relaxed max-w-2xl">
          {{ site.description }}
        </p>
        <p v-else class="text-slate-500 mt-3 text-sm italic">
          暂无描述
        </p>
      </div>

      <!-- 右侧：操作按钮 -->
      <div class="flex items-center gap-3 shrink-0">
        <button 
          class="btn-glass flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          @click="$emit('edit')"
        >
          <Icon icon="mdi:pencil" class="text-base" />
          编辑信息
        </button>
      </div>
    </div>

    <!-- 底部信息栏 -->
    <div class="mt-5 pt-5 border-t border-slate-700/50 flex flex-wrap items-center gap-6 text-sm">
      <div class="flex items-center gap-2 text-slate-400">
        <Icon icon="mdi:calendar-plus" class="text-slate-500" />
        <span>创建于 {{ formatDate(site.createdAt) }}</span>
      </div>
      <div class="flex items-center gap-2 text-slate-400">
        <Icon icon="mdi:sync" class="text-slate-500" />
        <span>更新于 {{ formatDate(site.updatedAt) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <Icon icon="mdi:shield-check" class="text-emerald-400" />
        <span class="text-emerald-400 font-medium">运行中</span>
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
