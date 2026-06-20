<template>
  <el-card shadow="never">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-medium">访问令牌</span>
        <el-button type="primary" size="small" @click="$emit('create')">
          <Icon icon="mdi:plus" class="mr-1" />创建令牌
        </el-button>
      </div>
    </template>

    <el-empty v-if="tokens.length === 0" description="暂无令牌，点击右上角创建">
      <el-button @click="$emit('create')">创建第一个令牌</el-button>
    </el-empty>

    <template v-else>
      <el-table :data="tokens" style="width: 100%">
        <el-table-column label="令牌名称" min-width="160">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ row.name }}</span>
              <el-tag
                :type="row.isActive ? 'success' : 'danger'"
                size="small"
                effect="light"
              >
                {{ row.isActive ? '有效' : '已禁用' }}
              </el-tag>
            </div>
            <p v-if="row.description" class="token-desc">
              {{ row.description }}
            </p>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="130">
          <template #default="{ row }">
            <span class="text-sm" style="color: var(--el-text-color-secondary)">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="190" align="right">
          <template #default="{ row }">
            <el-button size="small" text type="primary" @click="copyToken(row)"
              >复制</el-button
            >
            <el-button size="small" text @click="$emit('edit', row)"
              >编辑</el-button
            >
            <el-popconfirm
              title="确定删除此令牌？此操作不可撤销。"
              confirm-button-text="删除"
              cancel-button-text="取消"
              confirm-button-type="danger"
              :width="220"
              @confirm="$emit('delete', row.id)"
            >
              <template #reference>
                <el-button size="small" text type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 16px"
        description="令牌用于 SDK 和 API 访问，请妥善保管。可随时点击「复制」获取明文令牌。"
      />
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { Icon } from '@iconify/vue';
import type { SiteToken } from '@/api/sites';
import { useClipboard } from '@/composables';

defineProps<{ tokens: SiteToken[] }>();

defineEmits<{
  create: [];
  delete: [tokenId: number];
  edit: [token: SiteToken];
}>();

const { copy } = useClipboard({
  onSuccess: () => ElMessage.success('令牌已复制到剪贴板'),
  onError: () => ElMessage.error('复制失败'),
});

async function copyToken(row: SiteToken) {
  if (!row.token) {
    ElMessage.error('未获取到令牌明文');
    return;
  }
  await copy(row.token);
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
.token-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}
</style>
