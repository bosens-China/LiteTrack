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
      <n-select
        v-model:value="timeRange"
        :options="timeRangeOptions"
        placeholder="时间范围"
        size="small"
        style="width: 120px"
        @update:value="handleTimeRangeChange"
      />

      <n-input
        v-model:value="filters.path"
        placeholder="搜索路径"
        clearable
        size="small"
        style="width: 160px"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <Icon icon="mdi:magnify" class="text-slate-400 text-sm" />
        </template>
      </n-input>

      <n-date-picker
        v-model:value="dateRange"
        type="daterange"
        clearable
        size="small"
        style="width: 200px"
        placeholder="日期范围"
        @update:value="handleDateChange"
      />

      <div class="flex items-center gap-2 ml-auto">
        <button 
          class="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          @click="handleSearch"
        >
          <Icon icon="mdi:magnify" />
          查询
        </button>
        <button 
          class="btn-glass px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
          @click="handleReset"
        >
          <Icon icon="mdi:refresh" />
          重置
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-hidden flex flex-col">
      <n-data-table
        :columns="columns"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: AccessLog) => row.id"
        :max-height="400"
        remote
        size="small"
        class="h-full min-h-0"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, watch } from 'vue';
import {
  NInput,
  NDatePicker,
  NSelect,
  useMessage,
  type SelectOption,
} from 'naive-ui';
import { Icon } from '@iconify/vue';
import { useRequest } from 'vue-request';
import { getAccessLogs } from '@/api/stats';
import type { AccessLog } from '@/api/stats';
import type { DataTableColumns } from 'naive-ui';
import { formatLocalDate } from '@/utils';

const props = defineProps<{
  siteId: number;
}>();

const message = useMessage();

// 时间范围选项
type TimeRangeValue = '1' | '3' | '7' | '30' | 'all';

const timeRangeOptions: SelectOption[] = [
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

const dateRange = ref<[number, number] | null>(null);

// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
});

// 表格列定义
const columns: DataTableColumns<AccessLog> = [
  {
    title: '时间',
    key: 'createdAt',
    width: 160,
    render(row) {
      const date = new Date(row.createdAt)
      return h('div', { class: 'font-mono text-xs' }, [
        h('div', { class: 'text-[var(--text-primary)]' }, date.toLocaleDateString('zh-CN')),
        h('div', { class: 'text-[var(--text-muted)]' }, date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      ])
    },
  },
  {
    title: '页面',
    key: 'path',
    ellipsis: { tooltip: true },
    render(row) {
      const displayText = row.title || row.path;
      if (row.title && row.path && row.title !== row.path) {
        return h('div', [
          h('div', { class: 'text-[var(--text-primary)] text-sm font-medium' }, displayText),
          h('div', { class: 'text-[var(--text-secondary)] text-xs' }, row.path),
        ]);
      }
      return h('span', { class: 'text-[var(--text-primary)] text-sm' }, displayText);
    },
  },
  {
    title: 'IP',
    key: 'ip',
    width: 120,
    render(row) {
      return h('span', { class: 'font-mono text-xs text-[var(--text-secondary)]' }, row.ip || '-');
    },
  },
  {
    title: '来源',
    key: 'referer',
    width: 140,
    ellipsis: { tooltip: true },
    render(row) {
      if (!row.referer) return h('span', { class: 'text-[var(--text-muted)]' }, '-');
      try {
        const url = new URL(row.referer);
        return h('span', { class: 'text-xs text-blue-700' }, url.hostname);
      } catch {
        return h('span', { class: 'text-xs text-[var(--text-secondary)] truncate' }, row.referer);
      }
    },
  },
  {
    title: '设备',
    key: 'browser',
    width: 200,
    render(row) {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'text-xs text-[var(--text-primary)]' }, row.browser || '未知浏览器'),
        h('span', { class: 'text-slate-400' }, '/'),
        h('span', { class: 'text-xs text-[var(--text-secondary)]' }, row.os || '未知系统'),
        row.deviceType
          ? h(
              'span',
              {
                class:
                  'ml-1 inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]',
              },
              row.deviceType,
            )
          : null,
      ]);
    },
  },
];

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
      message.error(
        error instanceof Error ? error.message : '加载访问日志失败',
      );
    },
  }
);

const logs = ref<AccessLog[]>([]);

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

function handleDateChange(value: [number, number] | null) {
  if (value) {
    timeRange.value = 'all'
    filters.value.startDate = formatLocalDate(value[0]);
    filters.value.endDate = formatLocalDate(value[1]);
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
