<template>
  <!-- 网站列表表格：概览页与网站管理页共用，操作列由调用方通过 actions 插槽定义 -->
  <el-table
    v-loading="loading"
    :data="sites"
    row-key="id"
    style="width: 100%"
    :row-class-name="rowClickable ? 'cursor-pointer' : ''"
    @row-click="onRowClick"
  >
    <el-table-column label="网站" min-width="220">
      <template #default="{ row }">
        <div class="flex items-center gap-3">
          <div class="site-icon">
            <Icon icon="mdi:web" class="text-lg" />
          </div>
          <div class="min-w-0">
            <div
              class="font-medium text-sm truncate"
              style="color: var(--el-text-color-primary)"
            >
              {{ row.title || row.domain }}
            </div>
            <div
              class="text-xs truncate font-mono"
              style="color: var(--el-text-color-secondary)"
            >
              {{ row.domain }}
            </div>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="描述" min-width="180" show-overflow-tooltip>
      <template #default="{ row }">
        <span
          v-if="row.description"
          class="text-sm"
          style="color: var(--el-text-color-secondary)"
        >
          {{ row.description }}
        </span>
        <span
          v-else
          class="text-sm"
          style="color: var(--el-text-color-placeholder); font-style: italic"
        >
          暂无描述
        </span>
      </template>
    </el-table-column>

    <el-table-column label="令牌数" width="90" align="center">
      <template #default="{ row }">
        <el-tag type="success" size="small" effect="light">
          {{ row._count?.tokens ?? 0 }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="创建时间" width="140">
      <template #default="{ row }">
        <span
          class="text-sm font-mono"
          style="color: var(--el-text-color-secondary)"
        >
          {{ formatDate(row.createdAt) }}
        </span>
      </template>
    </el-table-column>

    <el-table-column
      v-if="$slots.actions"
      label="操作"
      :width="actionWidth"
      :align="actionAlign"
    >
      <template #default="{ row }">
        <slot name="actions" :row="row" />
      </template>
    </el-table-column>

    <template v-if="$slots.empty" #empty>
      <slot name="empty" />
    </template>
  </el-table>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
import type { Site } from '@/api/sites';

const props = withDefaults(
  defineProps<{
    sites: Site[];
    loading?: boolean;
    /** 行可点击时整行跳转，并触发 row-click */
    rowClickable?: boolean;
    actionWidth?: number | string;
    actionAlign?: 'left' | 'center' | 'right';
  }>(),
  {
    loading: false,
    rowClickable: false,
    actionWidth: 120,
    actionAlign: 'right',
  },
);

const emit = defineEmits<{ 'row-click': [row: Site] }>();

function onRowClick(row: Site) {
  if (props.rowClickable) emit('row-click', row);
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>

<style scoped>
.site-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
</style>
