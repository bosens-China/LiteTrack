<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <!-- 自定义头部 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Icon icon="mdi:key" class="text-lg text-amber-400" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">访问令牌</h3>
          <p class="text-xs text-slate-400">API 访问凭证管理</p>
        </div>
      </div>
      <button 
        class="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
        @click="$emit('create')"
      >
        <Icon icon="mdi:plus" />
        创建
      </button>
    </div>

    <!-- 空状态 -->
    <n-empty v-if="tokens.length === 0" description="暂无令牌" class="flex-1 flex flex-col justify-center">
      <template #icon>
        <Icon icon="mdi:key-off" class="text-4xl text-slate-600" />
      </template>
      <template #extra>
        <button 
          class="btn-glass mt-4 px-4 py-2 rounded-lg text-sm"
          @click="$emit('create')"
        >
          创建第一个令牌
        </button>
      </template>
    </n-empty>

    <!-- 令牌列表 -->
    <div v-else class="flex-1 overflow-hidden">
      <n-scrollbar style="max-height: 320px">
        <div class="space-y-3">
          <div
            v-for="token in tokens"
            :key="token.id"
            class="group p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
          >
            <div class="flex items-start justify-between gap-3">
              <!-- 左侧信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-slate-200 truncate">{{ token.name }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="token.isActive 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'"
                  >
                    {{ token.isActive ? '有效' : '已禁用' }}
                  </span>
                </div>
                
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <Icon icon="mdi:clock-outline" />
                    {{ formatDateTime(token.createdAt) }}
                  </span>
                </div>
                
                <p v-if="token.description" class="text-xs text-slate-400 mt-2 line-clamp-2">
                  {{ token.description }}
                </p>
              </div>

              <!-- 右侧操作 -->
              <n-popconfirm @positive-click="$emit('delete', token.id)">
                <template #trigger>
                  <button 
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="删除"
                  >
                    <Icon icon="mdi:delete-outline" class="text-lg" />
                  </button>
                </template>
                <span class="text-sm">确定删除此令牌？此操作不可撤销。</span>
              </n-popconfirm>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <!-- 底部提示 -->
    <div v-if="tokens.length > 0" class="mt-4 pt-4 border-t border-slate-700/30">
      <p class="text-xs text-slate-500 flex items-center gap-1.5">
        <Icon icon="mdi:information-outline" />
        令牌用于 SDK 和 API 访问，请妥善保管
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NEmpty, NScrollbar, NPopconfirm } from 'naive-ui';
import { Icon } from '@iconify/vue';
import type { SiteToken } from '@/api/sites';

interface Props {
  tokens: SiteToken[];
}

defineProps<Props>();

defineEmits<{
  create: [];
  delete: [tokenId: number];
}>();

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
