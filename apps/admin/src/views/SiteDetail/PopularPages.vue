<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <Icon icon="mdi:fire" class="text-lg" />
        </div>
        <div>
          <h3 class="panel-title">热门页面</h3>
          <p class="panel-subtitle">优先显示页面标题，其次展示路径。</p>
        </div>
      </div>
      <el-button text size="small" @click="openAllPages">
        查看全部
        <Icon icon="mdi:chevron-right" class="text-sm ml-0.5" />
      </el-button>
    </div>
    
    <el-empty v-if="pages.length === 0" description="暂无数据" class="flex-1 flex flex-col justify-center" />

    <div v-else class="flex-1 overflow-hidden">
      <!-- 滚动容器：替换 n-scrollbar，高度限制移到原生 div -->
      <div style="overflow: auto; max-height: 320px">
        <div class="space-y-2">
          <div
            v-for="(page, index) in pages"
            :key="page.path"
            class="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-200"
          >
            <div class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold font-mono"
              :class="[
                index === 0 ? 'bg-amber-100 text-amber-700' :
                index === 1 ? 'bg-slate-200 text-slate-700' :
                index === 2 ? 'bg-orange-100 text-orange-700' :
                'bg-slate-100 text-slate-500'
              ]"
            >
              {{ index + 1 }}
            </div>
            
            <div class="flex-1 min-w-0">
              <el-tooltip :content="page.path" placement="top">
                <div class="min-w-0">
                  <p class="text-sm text-[var(--text-primary)] font-medium truncate">
                    {{ primaryPageLabel(page) }}
                  </p>
                  <p
                    v-if="showPagePathSubline(page)"
                    class="text-xs text-[var(--text-secondary)] truncate font-mono"
                  >
                    {{ page.path }}
                  </p>
                </div>
              </el-tooltip>
            </div>
            
            <div class="shrink-0 flex items-center gap-1.5">
              <span class="text-xs text-[var(--text-secondary)]">{{ formatNumber(page.count) }}</span>
              <Icon icon="mdi:eye" class="text-xs text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="showModal"
      title="全部页面访问排行"
      :width="900"
      class="all-pages-dialog"
    >
      <div class="modal-body">
        <div class="mb-4 flex justify-end">
          <el-input
            v-model="searchQuery"
            placeholder="搜索页面路径或标题"
            clearable
            class="w-64"
            @input="handleSearch"
          >
            <template #prefix>
              <Icon icon="mdi:magnify" class="text-slate-400" />
            </template>
          </el-input>
        </div>

        <el-table
          v-loading="loading"
          :data="allPages"
          row-key="path"
          max-height="540"
          :default-sort="{ prop: 'count', order: 'descending' }"
          @sort-change="handleSortChange"
        >
          <el-table-column label="排名" width="80">
            <template #default="{ $index }">
              <span :class="rankClass(rankOf($index))">{{ rankOf($index) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="页面" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="text-[var(--text-primary)] font-medium">
                {{ primaryPageLabel(row) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="路径" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="font-mono text-xs text-[var(--text-secondary)]">{{ row.path }}</span>
            </template>
          </el-table-column>

          <el-table-column label="访问量" width="150" prop="count" sortable="custom">
            <template #default="{ row }">
              <span class="font-mono text-emerald-700">{{ formatNumber(row.count) }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="table-pagination">
          <el-pagination
            layout="total, sizes, prev, pager, next"
            :total="pagination.itemCount"
            :page-size="pagination.pageSize"
            :current-page="pagination.page"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { getSitePages, getPopularPages } from '@/api/stats'
import type { PageView } from '@/api/stats'
import { useRequest } from 'vue-request'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  siteId: number
}>()

// 顶部列表数据
const pages = ref<PageView[]>([])

const showModal = ref(false)
const allPages = ref<PageView[]>([])
const searchQuery = ref('')

// 弹窗表格分页状态
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
})

const sortState = reactive({
  key: 'count',
  order: 'desc' as 'asc' | 'desc',
})

// 当前页内的排名（含分页偏移）
function rankOf(index: number): number {
  return (pagination.page - 1) * pagination.pageSize + index + 1
}

// 排名徽章样式
function rankClass(rank: number): string {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono'
  if (rank === 1) return `${base} bg-amber-100 text-amber-700`
  if (rank === 2) return `${base} bg-slate-200 text-slate-700`
  if (rank === 3) return `${base} bg-orange-100 text-orange-700`
  return `${base} text-slate-500`
}

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

/** 有有效标题用标题，否则用路径 */
function primaryPageLabel(row: PageView): string {
  const t = row.title?.trim()
  return t ? t : row.path
}

/** 仅当标题存在且与路径不同时，副行展示路径 */
function showPagePathSubline(row: PageView): boolean {
  const t = row.title?.trim()
  return Boolean(t && t !== row.path)
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
      ElMessage.error(error instanceof Error ? error.message : '加载热门页面失败')
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
      ElMessage.error(error instanceof Error ? error.message : '加载页面数据失败')
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
  refresh()
}

function handleSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  refresh()
}

// el-table 自定义排序：order 为 ascending/descending/null
function handleSortChange(payload: {
  prop: string | null
  order: 'ascending' | 'descending' | null
}) {
  sortState.key = payload.prop || 'count'
  sortState.order = payload.order === 'ascending' ? 'asc' : 'desc'
  refresh()
}

// 监听 siteId 变化
watch(() => props.siteId, () => {
  fetchTopPages()
}, { immediate: true })
</script>

<style scoped>
.modal-body {
  min-height: 620px;
}
</style>
