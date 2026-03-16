<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <!-- 自定义头部 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <Icon icon="mdi:fire" class="text-lg text-violet-400" />
        </div>
        <div>
          <h3 class="text-lg font-semibold text-white">热门页面</h3>
          <p class="text-xs text-slate-400">访问量 Top 10</p>
        </div>
      </div>
      <button 
        class="btn-glass text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
        @click="openAllPages"
      >
        查看全部
        <Icon icon="mdi:chevron-right" class="text-sm" />
      </button>
    </div>
    
    <!-- 空状态 -->
    <n-empty v-if="pages.length === 0" description="暂无数据" class="flex-1 flex flex-col justify-center" />
    
    <!-- 列表内容 -->
    <div v-else class="flex-1 overflow-hidden">
      <n-scrollbar style="max-height: 320px">
        <div class="space-y-2">
          <div
            v-for="(page, index) in pages"
            :key="page.path"
            class="group flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-600/30"
          >
            <!-- 排名 -->
            <div class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold font-mono"
              :class="[
                index === 0 ? 'bg-amber-500/20 text-amber-400' :
                index === 1 ? 'bg-slate-400/20 text-slate-300' :
                index === 2 ? 'bg-orange-600/20 text-orange-400' :
                'bg-slate-800 text-slate-500'
              ]"
            >
              {{ index + 1 }}
            </div>
            
            <!-- 页面信息 -->
            <div class="flex-1 min-w-0">
              <n-tooltip placement="top" trigger="hover">
                <template #trigger>
                  <p class="text-sm text-slate-200 font-medium truncate group-hover:text-white transition-colors">
                    {{ page.title || page.path }}
                  </p>
                </template>
                <span class="text-xs">{{ page.path }}</span>
              </n-tooltip>
            </div>
            
            <!-- 访问次数 -->
            <div class="shrink-0 flex items-center gap-1.5">
              <span class="text-xs text-slate-400">{{ formatNumber(page.count) }}</span>
              <Icon icon="mdi:eye" class="text-xs text-slate-500" />
            </div>
          </div>
        </div>
      </n-scrollbar>
    </div>

    <!-- 全部页面弹窗 -->
    <n-modal 
      v-model:show="showModal" 
      preset="card" 
      title="全部页面访问排行" 
      class="w-full max-w-4xl"
      :style="{ background: 'var(--bg-secondary)' }"
    >
      <div class="mb-4 flex justify-end">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索页面路径或标题"
          clearable
          @input="handleSearch"
          class="w-64"
        >
          <template #prefix>
            <Icon icon="mdi:magnify" class="text-slate-400" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, h } from 'vue'
import { NEmpty, NModal, NDataTable, NInput, NScrollbar, NTooltip, useMessage } from 'naive-ui'
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
    render: (_, index) => {
      const rank = (pagination.page! - 1) * (pagination.pageSize!) + index + 1
      return h('span', {
        class: `inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono ${
          rank === 1 ? 'bg-amber-500/20 text-amber-400' :
          rank === 2 ? 'bg-slate-400/20 text-slate-300' :
          rank === 3 ? 'bg-orange-600/20 text-orange-400' :
          'text-slate-500'
        }`
      }, rank)
    }
  },
  {
    title: '页面',
    key: 'title',
    render: (row) => {
      const displayText = row.title || row.path
      return h(NTooltip, { placement: 'top', trigger: 'hover' }, {
        trigger: () => h('span', { class: 'text-slate-200 font-medium cursor-help' }, displayText),
        default: () => h('span', { class: 'text-xs' }, row.path)
      })
    },
    ellipsis: { tooltip: false }
  },
  {
    title: '访问量',
    key: 'count',
    width: 150,
    sorter: true,
    render: (row) => h('span', { class: 'font-mono text-emerald-400' }, formatNumber(row.count))
  }
]

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

// 加载顶部热门页面
const { run: fetchTopPages } = useRequest(
  async () => {
    const { popularPages } = await getPopularPages(props.siteId)
    pages.value = popularPages.slice(0, 10)
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
