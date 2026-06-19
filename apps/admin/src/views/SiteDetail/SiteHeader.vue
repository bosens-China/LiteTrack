<template>
  <el-card shadow="never">
    <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div class="flex items-start gap-3 flex-1 min-w-0">
        <div class="site-icon">
          <Icon icon="mdi:web" class="text-xl" />
        </div>
        <div class="min-w-0">
          <h1 class="site-title">{{ site.title || '未命名网站' }}</h1>
          <a
            :href="'https://' + site.domain"
            target="_blank"
            rel="noopener"
            class="site-domain"
          >
            <Icon icon="mdi:link-variant" />
            <span class="font-mono">{{ site.domain }}</span>
          </a>
          <p v-if="site.description" class="site-desc">{{ site.description }}</p>
          <p v-else class="site-desc site-desc--empty">暂无描述</p>
        </div>
      </div>

      <el-button @click="$emit('edit')">
        <Icon icon="mdi:pencil" class="mr-1" />编辑信息
      </el-button>
    </div>

    <el-divider style="margin: 16px 0 12px" />

    <el-space :size="24">
      <span class="meta-item">
        <Icon icon="mdi:calendar-plus" />
        创建于 {{ formatDate(site.createdAt) }}
      </span>
      <span class="meta-item">
        <Icon icon="mdi:sync" />
        更新于 {{ formatDate(site.updatedAt) }}
      </span>
    </el-space>
  </el-card>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { SiteDetail } from '@/api/sites'

defineProps<{ site: SiteDetail }>()

defineEmits<{ edit: [] }>()

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.site-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.site-title {
  margin: 0 0 4px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.site-domain {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-decoration: none;
}

.site-domain:hover {
  color: var(--el-color-primary);
}

.site-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.site-desc--empty {
  font-style: italic;
  color: var(--el-text-color-placeholder);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
