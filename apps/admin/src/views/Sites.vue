<template>
  <div class="space-y-4">
    <!-- 操作栏 -->
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">网站列表</h2>
      <n-button type="primary" @click="showCreateModal = true">
        <template #icon>
          <Icon icon="mdi:plus" />
        </template>
        创建网站
      </n-button>
    </div>

    <!-- 网站表格 -->
    <n-card>
      <n-data-table
        :columns="columns"
        :data="sitesStore.sites"
        :loading="sitesStore.loading"
        :pagination="pagination"
        :row-key="(row: Site) => row.id"
      />
    </n-card>

    <!-- 创建网站弹窗 -->
    <CreateSiteModal v-model:show="showCreateModal" @success="handleCreateSuccess" />
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import {
  NButton,
  NCard,
  NDataTable,
  NPopconfirm,
  NSpace,
  useMessage,
} from 'naive-ui';
import { Icon } from '@iconify/vue';
import { useSitesStore } from '@/stores/sites';
import CreateSiteModal from '@/components/CreateSiteModal.vue';
import type { Site } from '@/api/sites';

const router = useRouter();
const sitesStore = useSitesStore();
const message = useMessage();

// 弹窗状态
const showCreateModal = ref(false);

// 表格分页配置
const pagination = {
  pageSize: 10,
};

// 表格列定义
const columns: DataTableColumns<Site> = [
  {
    title: '网站名称',
    key: 'title',
    render(row) {
      return h('div', [
        h('div', { class: 'font-medium' }, row.title || row.domain),
        row.title
          ? h('div', { class: 'text-gray-500 text-sm' }, row.domain)
          : null,
      ]);
    },
  },
  {
    title: '描述',
    key: 'description',
    render(row) {
      return row.description || '-';
    },
  },
  {
    title: '令牌数',
    key: 'tokens',
    width: 100,
    render(row) {
      return row._count?.tokens || 0;
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString('zh-CN');
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    render(row) {
      return h(
        NSpace,
        {},
        {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                onClick: () => router.push(`/sites/${row.id}`),
              },
              {
                default: () => '查看统计',
                icon: () => h(Icon, { icon: 'mdi:chart-line' }),
              },
            ),

            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row),
              },
              {
                trigger: () =>
                  h(
                    NButton,
                    {
                      size: 'small',
                      type: 'error',
                      secondary: true,
                    },
                    {
                      default: () => '删除',
                      icon: () => h(Icon, { icon: 'mdi:delete' }),
                    },
                  ),
                default: () =>
                  `确定要删除网站 "${row.title || row.domain}" 吗？此操作不可恢复。`,
              },
            ),
          ],
        },
      );
    },
  },
];

// 删除处理
async function handleDelete(site: Site) {
  try {
    await sitesStore.removeSite(site.id);
    message.success('删除成功');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败';
    message.error(errorMessage);
  }
}

// 创建成功处理
function handleCreateSuccess(siteId: number) {
  // 刷新列表
  void sitesStore.fetchSites();
  // 跳转到新创建的网站详情
  router.push(`/sites/${siteId}`);
}

onMounted(() => {
  sitesStore.fetchSites();
});
</script>
