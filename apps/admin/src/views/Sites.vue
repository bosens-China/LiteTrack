<template>
  <div class="space-y-4">
    <!-- 操作栏 -->
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">网站列表</h2>
      <n-button type="primary" @click="router.push('/sites/new')">
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
    
    <!-- 删除确认对话框 -->
    <n-modal
      v-model:show="showDeleteModal"
      preset="dialog"
      title="确认删除"
      positive-text="删除"
      negative-text="取消"
      :positive-button-props="{ type: 'error' }"
      @positive-click="confirmDelete"
    >
      <p>确定要删除网站 "{{ siteToDelete?.title }}" 吗？</p>
      <p class="text-red-500 text-sm mt-2">此操作不可恢复，所有统计数据将被删除。</p>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import {
  NButton,
  NCard,
  NDataTable,
  NModal,
  NPopconfirm,
  NSpace,
  useMessage,
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import type { Site } from '@/api/sites'

const router = useRouter()
const sitesStore = useSitesStore()
const message = useMessage()

const showDeleteModal = ref(false)
const siteToDelete = ref<Site | null>(null)

// 表格分页配置
const pagination = {
  pageSize: 10,
}

// 表格列定义
const columns: DataTableColumns<Site> = [
  {
    title: '网站名称',
    key: 'title',
    render(row) {
      return h('div', [
        h('div', { class: 'font-medium' }, row.title),
        h('div', { class: 'text-gray-500 text-sm' }, row.domain),
      ])
    },
  },
  {
    title: '描述',
    key: 'description',
    render(row) {
      return row.description || '-'
    },
  },
  {
    title: '令牌数',
    key: 'tokens',
    width: 100,
    render(row) {
      return row._count?.tokens || 0
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString('zh-CN')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render(row) {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => router.push(`/sites/${row.id}`),
          }, { default: () => '查看统计', icon: () => h(Icon, { icon: 'mdi:chart' }) }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDelete(row),
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
            }, { default: () => '删除', icon: () => h(Icon, { icon: 'mdi:delete' }) }),
            default: () => '确定删除此网站？',
          }),
        ],
      })
    },
  },
]

// 删除处理
function handleDelete(site: Site) {
  siteToDelete.value = site
  showDeleteModal.value = true
}

// 确认删除
async function confirmDelete() {
  if (!siteToDelete.value) return
  
  try {
    await sitesStore.removeSite(siteToDelete.value.id)
    message.success('删除成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败'
    message.error(errorMessage)
  }
  siteToDelete.value = null
}

onMounted(() => {
  sitesStore.fetchSites()
})
</script>
