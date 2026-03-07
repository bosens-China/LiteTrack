<template>
  <n-card>
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold">{{ site.title || '未命名网站' }}</h1>
        <p class="text-gray-500 mt-1">{{ site.domain }}</p>
        <p v-if="site.description" class="text-gray-600 mt-2">{{ site.description }}</p>
      </div>
      <n-space>
        <n-button @click="$emit('edit')">
          <template #icon>
            <Icon icon="mdi:pencil" />
          </template>
          编辑
        </n-button>
      </n-space>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { NSpace, NButton, NCard } from 'naive-ui'
import { Icon } from '@iconify/vue'
import type { SiteDetail } from '@/api/sites'

interface Props {
  site: SiteDetail
}

defineProps<Props>()

defineEmits<{
  edit: []
}>()
</script>
