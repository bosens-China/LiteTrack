<template>
  <n-card title="热门页面 TOP 10">
    <template #header-extra>
      <n-button text type="primary" @click="openAllPages">
        查看全部
      </n-button>
    </template>
    
    <n-empty v-if="pages.length === 0" description="暂无数据" />
    <n-scrollbar v-else style="max-height: 320px">
      <n-list>
        <n-list-item v-for="(page, index) in pages" :key="page.path">
          <n-thing>
            <template #avatar>
              <span class="text-lg font-bold text-gray-400 w-8">{{ index + 1 }}</span>
            </template>
            <template #header>
              <div class="truncate max-w-md" :title="page.path">{{ page.path }}</div>
            </template>
            <template #header-extra>
              <n-tag type="success">{{ page.count }} 次访问</n-tag>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-scrollbar>

    <!-- 全部页面弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="全部页面访问排行" class="w-full max-w-4xl">
      <div class="mb-4 flex justify-end">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索页面路径或标题"
          clearable
          @input="handleSearch"
          class="w-64"
        >
          <template #prefix>
            <Icon icon="mdi:magnify" />
          </template>
        </n-input>
      </div>
      <n-data-table
        remote
        :columns="columns"
        :data="allPages"
        :loading="loading"
        :pagination="pagination"
        :max-height="600"
        @update:page="handlePageChange"
        @update:sorter="handleSorterChange"
      />
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { NCard, NEmpty, NList, NListItem, NThing, NTag, NButton, NModal, NDataTable, NInput, NScrollbar, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { getSitePages, getPopularPages } from '@/api/stats'
import type { PageView } from '@/api/stats'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { useRequest } from 'vue-request'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  siteId: number
}>()

const message = useMessage()

// 顶部列表数据
const pages = ref<PageView[]>([])

const showModal = ref(false)
const allPages = ref<PageView[]>([])
const searchQuery = ref('')

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page
    refresh()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    refresh()
  }
})

const sortState = reactive({
  key: 'count',
  order: 'desc' as 'asc' | 'desc' | false
})

const columns: DataTableColumns<PageView> = [
  {
    title: '排名',
    key: 'index',
    width: 80,
    render: (_, index) => (pagination.page! - 1) * (pagination.pageSize!) + index + 1
  },
  {
    title: '页面',
    key: 'path',
    render: (row) => {
      // 简单组合 title 和 path
      return row.title 
        ? `${row.title} (${row.path})` 
        : row.path
    },
    ellipsis: { tooltip: true }
  },
  {
    title: '访问量',
    key: 'count',
    width: 150,
    sorter: true,
    render: (row) => `${row.count}`
  }
]

// 加载顶部热门页面
const { run: fetchTopPages } = useRequest(
  async () => {
    const { popularPages } = await getPopularPages(props.siteId)
    pages.value = popularPages
  },
  {
    manual: true,
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '加载热门页面失败')
    }
  }
)

// 加载全部页面（弹窗表格）
const { run: fetchPages, loading, refresh } = useRequest(
  async () => {
    const { pages, pagination: meta } = await getSitePages(props.siteId, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      q: searchQuery.value,
      sortBy: sortState.key,
      sortOrder: sortState.order || 'desc'
    })
    allPages.value = pages
    pagination.itemCount = meta.total
    return pages
  },
  {
    manual: true,
    debounceInterval: 300,
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '加载页面数据失败')
    }
  }
)

function openAllPages() {
  showModal.value = true
  // 重置状态
  pagination.page = 1
  searchQuery.value = ''
  fetchPages()
}

const handleSearch = useDebounceFn(() => {
  pagination.page = 1
  refresh()
}, 300)

function handlePageChange(page: number) {
  pagination.page = page
  // refresh() 通过上方的 pagination.onChange 绑定处理
}

function handleSorterChange(sorter: { columnKey: string; order: 'ascend' | 'descend' | false }) {
  sortState.key = sorter.columnKey
  sortState.order = sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : 'desc'
  refresh()
}

// 监听 siteId 变化
watch(() => props.siteId, () => {
  fetchTopPages()
}, { immediate: true })
</script>
