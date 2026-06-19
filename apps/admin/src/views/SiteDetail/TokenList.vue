<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Icon icon="mdi:key" class="text-lg" />
        </div>
        <div class="min-w-0">
          <h3 class="panel-title">访问令牌</h3>
          <p class="panel-subtitle">只展示令牌元信息，明文仅在创建时显示一次。</p>
        </div>
      </div>
      <el-button type="primary" size="small" class="shrink-0" @click="$emit('create')">
        <Icon icon="mdi:plus" class="mr-1" />
        创建
      </el-button>
    </div>

    <el-empty v-if="tokens.length === 0" description="暂无令牌" class="flex-1 flex flex-col justify-center">
      <el-button @click="$emit('create')">创建第一个令牌</el-button>
    </el-empty>

    <div v-else class="flex-1 overflow-hidden">
      <div style="max-height: 320px; overflow: auto">
        <div class="space-y-3">
          <div
            v-for="token in tokens"
            :key="token.id"
            class="group p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-medium text-[var(--text-primary)] truncate">{{ token.name }}</span>
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="token.isActive 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'"
                  >
                    {{ token.isActive ? '有效' : '已禁用' }}
                  </span>
                </div>
                
                <div class="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span class="flex items-center gap-1">
                    <Icon icon="mdi:clock-outline" />
                    {{ formatDateTime(token.createdAt) }}
                  </span>
                </div>
                
                <p v-if="token.description" class="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                  {{ token.description }}
                </p>
              </div>

              <div class="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-all"
                  title="编辑"
                  @click="$emit('edit', token)"
                >
                  <Icon icon="mdi:pencil-outline" class="text-lg" />
                </button>
                <el-popconfirm
                  title="确定删除此令牌？此操作不可撤销。"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  confirm-button-type="danger"
                  :width="220"
                  @confirm="$emit('delete', token.id)"
                >
                  <template #reference>
                    <button
                      type="button"
                      class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-all"
                      title="删除"
                    >
                      <Icon icon="mdi:delete-outline" class="text-lg" />
                    </button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tokens.length > 0" class="mt-4 pt-4 border-t border-slate-200">
      <p class="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
        <Icon icon="mdi:information-outline" />
        令牌用于 SDK 和 API 访问，请妥善保管
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { SiteToken } from '@/api/sites';

interface Props {
  tokens: SiteToken[];
}

defineProps<Props>();

defineEmits<{
  create: [];
  delete: [tokenId: number];
  edit: [token: SiteToken];
}>();

function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
