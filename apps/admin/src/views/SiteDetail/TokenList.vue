<template>
  <n-card title="访问令牌">
    <template #header-extra>
      <n-button @click="$emit('create')">
        <template #icon>
          <Icon icon="mdi:plus" />
        </template>
        创建令牌
      </n-button>
    </template>

    <n-empty v-if="tokens.length === 0" description="暂无令牌" />
    <n-list v-else>
      <n-list-item v-for="token in tokens" :key="token.id">
        <n-thing>
          <template #header>
            {{ token.name }}
            <n-tag v-if="token.isActive" size="small" type="success"
              >有效</n-tag
            >
            <n-tag v-else size="small" type="error">已禁用</n-tag>
          </template>
          <template #description>
            <div class="space-y-1">
              <p>创建于 {{ formatDateTime(token.createdAt) }}</p>
              <p v-if="token.description" class="text-gray-500">
                {{ token.description }}
              </p>
            </div>
          </template>
          <template #header-extra>
            <n-popconfirm @positive-click="$emit('delete', token.id)">
              <template #trigger>
                <n-button size="small" type="error">删除</n-button>
              </template>
              确定删除此令牌？
            </n-popconfirm>
          </template>
        </n-thing>
      </n-list-item>
    </n-list>
  </n-card>
</template>

<script setup lang="ts">
import {
  NCard,
  NButton,
  NList,
  NListItem,
  NThing,
  NTag,
  NPopconfirm,
  NEmpty,
} from 'naive-ui';
import { Icon } from '@iconify/vue';
import type { SiteToken } from '@/api/sites';
import { formatDateTime } from '@/utils';

interface Props {
  tokens: SiteToken[];
}

defineProps<Props>();

defineEmits<{
  create: [];
  delete: [tokenId: number];
}>();
</script>
