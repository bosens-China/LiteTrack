<template>
  <el-dialog
    :model-value="show"
    title="全部页面访问排行"
    :width="900"
    @update:model-value="$emit('update:show', $event)"
    @open="onOpen"
  >
    <div class="dialog-body">
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
            <span style="font-weight: 500">{{ primaryPageLabel(row) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="路径" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="font-mono text-xs" style="color: var(--el-text-color-secondary)">
              {{ row.path }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="访问量" width="150" prop="count" sortable="custom">
          <template #default="{ row }">
            <span class="font-mono" style="color: var(--el-color-success)">
              {{ formatNumber(row.count) }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end" style="padding-top: 12px">
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
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { getSitePages } from '@/api/stats'
import type { PageView } from '@/api/stats'
import { useRequest } from 'vue-request'
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{
  siteId: number
  show: boolean
}>()

defineEmits<{ 'update:show': [value: boolean] }>()

const allPages = ref<PageView[]>([])
const searchQuery = ref('')

const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0,
})

const sortState = reactive({
  key: 'count',
  order: 'desc' as 'asc' | 'desc',
})

function rankOf(index: number): number {
  return (pagination.page - 1) * pagination.pageSize + index + 1
}

function rankClass(rank: number): string {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono'
  if (rank === 1) return `${base} bg-amber-100 text-amber-700`
  if (rank === 2) return `${base} bg-slate-200 text-slate-700`
  if (rank === 3) return `${base} bg-orange-100 text-orange-700`
  return `${base} text-slate-500`
}

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

function primaryPageLabel(row: PageView): string {
  const t = row.title?.trim()
  return t ? t : row.path
}

const { run: fetchPages, loading, refresh } = useRequest(
  async () => {
    const { pages, pagination: meta } = await getSitePages(props.siteId, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      q: searchQuery.value,
      sortBy: sortState.key,
      sortOrder: sortState.order || 'desc',
    })
    allPages.value = pages
    pagination.itemCount = meta.total
    return pages
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(error instanceof Error ? error.message : '加载页面数据失败')
    },
  },
)

function onOpen() {
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

function handleSortChange(payload: {
  prop: string | null
  order: 'ascending' | 'descending' | null
}) {
  sortState.key = payload.prop || 'count'
  sortState.order = payload.order === 'ascending' ? 'asc' : 'desc'
  refresh()
}
</script>

<style scoped>
.dialog-body {
  min-height: 620px;
}
</style>
