<template>
  <n-card title="热门页面 TOP 10">
    <n-empty v-if="pages.length === 0" description="暂无数据" />
    <n-list v-else>
      <n-list-item v-for="(page, index) in pages" :key="page.path">
        <n-thing>
          <template #avatar>
            <span class="text-lg font-bold text-gray-400 w-8">{{ index + 1 }}</span>
          </template>
          <template #header>
            {{ page.path }}
          </template>
          <template #header-extra>
            <n-tag type="success">{{ page.count }} 次访问</n-tag>
          </template>
        </n-thing>
      </n-list-item>
    </n-list>
  </n-card>
</template>

<script setup lang="ts">
import { NCard, NEmpty, NList, NListItem, NThing, NTag } from 'naive-ui'
import type { PageView } from '@/api/stats'

interface Props {
  pages: PageView[]
}

defineProps<Props>()
</script>
