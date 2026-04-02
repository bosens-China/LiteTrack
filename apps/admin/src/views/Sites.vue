<template>
  <div class="page-shell">
    <div class="page-header">
      <div class="page-header__title">
        <div class="page-header__icon">
          <Icon icon="mdi:web" class="text-xl" />
        </div>
        <div>
          <h1 class="page-title">网站管理</h1>
          <p class="page-subtitle">管理站点基础信息，并进入详情页查看统计趋势。</p>
        </div>
      </div>
      <button class="btn-primary px-4 py-2 rounded-lg" @click="showCreateModal = true">
        <Icon icon="mdi:plus" />
        创建网站
      </button>
    </div>

    <div class="glass-card p-2 overflow-hidden">
      <n-data-table
        :columns="columns"
        :data="sitesStore.sites"
        :loading="sitesStore.loading"
        :pagination="pagination"
        :row-key="(row: Site) => row.id"
        class="sites-table"
      />
    </div>

    <!-- 创建网站弹窗 -->
    <CreateSiteModal v-model:show="showCreateModal" @success="handleCreateSuccess" />
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { DataTableColumns } from 'naive-ui';
import {
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

// 格式化日期
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 表格列定义
const columns: DataTableColumns<Site> = [
  {
    title: '网站',
    key: 'title',
    render(row) {
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', {
          class: 'w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0'
        }, [
          h(Icon, { icon: 'mdi:web', class: 'text-lg' })
        ]),
        h('div', [
          h('div', { class: 'font-medium text-[var(--text-primary)]' }, row.title || row.domain),
          h('div', { class: 'text-[var(--text-secondary)] text-xs' }, row.domain),
        ]),
      ])
    },
  },
  {
    title: '描述',
    key: 'description',
    ellipsis: { tooltip: true },
    render(row) {
      return row.description
        ? h('span', { class: 'text-[var(--text-secondary)] text-sm' }, row.description)
        : h('span', { class: 'text-[var(--text-muted)] text-sm italic' }, '暂无描述')
    },
  },
  {
    title: '令牌数',
    key: 'tokens',
    width: 100,
    align: 'center',
    render(row) {
      return h('span', {
        class: 'px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200'
      }, row._count?.tokens || 0)
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 140,
    render(row) {
      return h('span', { class: 'text-[var(--text-secondary)] text-sm font-mono' }, formatDate(row.createdAt))
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 220,
    render(row) {
      return h(
        NSpace,
        { size: 'small' },
        {
          default: () => [
            h(
              'button',
              {
                class: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium',
                onClick: () => router.push(`/sites/${row.id}`),
              },
              [
                h(Icon, { icon: 'mdi:chart-line', class: 'text-sm' }),
                '查看统计',
              ],
            ),

            h(
              NPopconfirm,
              {
                onPositiveClick: () => handleDelete(row),
              },
              {
                trigger: () =>
                  h(
                    'button',
                    {
                      class: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors text-sm font-medium',
                    },
                    [
                      h(Icon, { icon: 'mdi:delete', class: 'text-sm' }),
                      '删除',
                    ],
                  ),
                default: () =>
                  h('span', { class: 'text-sm' }, `确定要删除网站 "${row.title || row.domain}" 吗？此操作不可恢复。`),
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
  void sitesStore.fetchSites();
  router.push(`/sites/${siteId}`);
}

onMounted(() => {
  void sitesStore.fetchSites()
})
</script>

<style scoped>
:deep(.sites-table .n-data-table-td) {
  padding: 12px 16px !important;
}

:deep(.sites-table .n-data-table-th) {
  padding: 12px 16px !important;
  font-weight: 600;
}
</style>
