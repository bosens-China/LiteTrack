<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
        <Icon icon="mdi:clipboard-list" class="text-lg" />
      </div>
      <div>
        <h3 class="panel-title">访问日志</h3>
        <p class="panel-subtitle">默认显示最近 7 天访问记录。</p>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <el-select
        v-model="timeRange"
        placeholder="时间范围"
        size="small"
        style="width: 120px"
        @change="handleTimeRangeChange"
      >
        <el-option
          v-for="option in timeRangeOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <el-input
        v-model="filters.path"
        placeholder="搜索路径"
        clearable
        size="small"
        style="width: 160px"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <Icon icon="mdi:magnify" class="text-slate-400 text-sm" />
        </template>
      </el-input>

      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="x"
        clearable
        size="small"
        style="width: 220px"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="handleDateChange"
      />

      <div class="flex items-center gap-2 ml-auto">
        <el-button type="primary" size="small" @click="handleSearch">
          <Icon icon="mdi:magnify" class="mr-1" />
          查询
        </el-button>
        <el-button size="small" @click="handleReset">
          <Icon icon="mdi:refresh" class="mr-1" />
          重置
        </el-button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden flex flex-col">
      <el-table
        v-loading="loading"
        :data="logs"
        row-key="id"
        size="small"
        max-height="400"
        class="logs-table"
      >
        <el-table-column label="时间" width="160">
          <template #default="{ row }">
            <div class="font-mono text-xs">
              <div class="text-[var(--text-primary)]">
                {{ formatLogDate(row.createdAt) }}
              </div>
              <div class="text-[var(--text-muted)]">
                {{ formatLogTime(row.createdAt) }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="页面" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.title && row.path && row.title !== row.path">
              <div class="text-[var(--text-primary)] text-sm font-medium">
                {{ row.title }}
              </div>
              <div class="text-[var(--text-secondary)] text-xs">{{ row.path }}</div>
            </div>
            <span v-else class="text-[var(--text-primary)] text-sm">
              {{ row.title || row.path }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="IP" width="120">
          <template #default="{ row }">
            <span class="font-mono text-xs text-[var(--text-secondary)]">
              {{ row.ip || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="来源" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="!row.referer" class="text-[var(--text-muted)]">-</span>
            <span v-else class="text-xs text-blue-700">{{ refererHost(row.referer) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="设备" width="200">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-xs text-[var(--text-primary)]">
                {{ row.browser || '未知浏览器' }}
              </span>
              <span class="text-slate-400">/</span>
              <span class="text-xs text-[var(--text-secondary)]">
                {{ row.os || '未知系统' }}
              </span>
              <span
                v-if="row.deviceType"
                class="ml-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
              >
                {{ row.deviceType }}
              </span>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-pagination">
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="pagination.itemCount"
          :page-size="pagination.pageSize"
          :current-page="pagination.page"
          :page-sizes="pagination.pageSizes"
          size="small"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useRequest } from 'vue-request';
import { getAccessLogs } from '@/api/stats';
import type { AccessLog } from '@/api/stats';
import { formatLocalDate } from '@/utils';

const props = defineProps<{
  siteId: number;
}>();

// 时间范围选项
type TimeRangeValue = '1' | '3' | '7' | '30' | 'all';

const timeRangeOptions: { label: string; value: TimeRangeValue }[] = [
  { label: '今天', value: '1' },
  { label: '3天', value: '3' },
  { label: '7天', value: '7' },
  { label: '30天', value: '30' },
  { label: '全部', value: 'all' },
];

// 筛选条件
const timeRange = ref<TimeRangeValue>('7');
const filters = ref({
  path: '',
  startDate: '',
  endDate: '',
});

// el-date-picker daterange，value-format="x" 返回毫秒时间戳字符串数组
const dateRange = ref<[string, string] | null>(null);

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  pageSizes: [10, 20, 50, 100],
});

const logs = ref<AccessLog[]>([]);

// 单元格格式化
function formatLogDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN');
}

function formatLogTime(value: string): string {
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function refererHost(referer: string): string {
  try {
    return new URL(referer).hostname;
  } catch {
    return referer;
  }
}

// 根据时间范围计算日期
function getDateRangeByDays(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
  };
}

// 应用时间范围筛选
function applyTimeRange(range: TimeRangeValue) {
  if (range === 'all') {
    filters.value.startDate = '';
    filters.value.endDate = '';
  } else {
    const days = parseInt(range, 10);
    const { startDate, endDate } = getDateRangeByDays(days);
    filters.value.startDate = startDate;
    filters.value.endDate = endDate;
  }
}

// 时间范围变化
function handleTimeRangeChange(value: TimeRangeValue) {
  timeRange.value = value;
  applyTimeRange(value);
  dateRange.value = null;
  handleSearch();
}

// 使用 vue-request 管理请求
const { run: fetchLogs, loading } = useRequest(
  async () => {
    const { logs: data, pagination: meta } = await getAccessLogs(props.siteId, {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      path: filters.value.path || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
    });
    logs.value = data;
    pagination.value.itemCount = meta.total;
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(error instanceof Error ? error.message : '加载访问日志失败');
    },
  },
);

// 查询
function handleSearch() {
  pagination.value.page = 1;
  fetchLogs();
}

// 重置
function handleReset() {
  timeRange.value = '7';
  filters.value = {
    path: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = null;
  pagination.value.page = 1;
  applyTimeRange('7');
  fetchLogs();
}

function handleDateChange(value: [string, string] | null) {
  if (value) {
    timeRange.value = 'all';
    filters.value.startDate = formatLocalDate(Number(value[0]));
    filters.value.endDate = formatLocalDate(Number(value[1]));
  } else {
    filters.value.startDate = '';
    filters.value.endDate = '';
  }
}

// 分页变化
function handlePageChange(page: number) {
  pagination.value.page = page;
  fetchLogs();
}

function handlePageSizeChange(pageSize: number) {
  pagination.value.pageSize = pageSize;
  pagination.value.page = 1;
  fetchLogs();
}

// 监听 siteId 变化
watch(
  () => props.siteId,
  () => {
    handleReset();
  },
  { immediate: true },
);
</script>

<style scoped>
.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
}
</style>
