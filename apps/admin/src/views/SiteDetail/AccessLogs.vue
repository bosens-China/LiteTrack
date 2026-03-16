<template>
  <div class="glass-card p-5 h-full flex flex-col">
    <!-- 自定义头部 -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
        <Icon icon="mdi:clipboard-list" class="text-lg text-emerald-400" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-white">访问日志</h3>
        <p class="text-xs text-slate-400">详细的访问记录</p>
      </div>
    </div>

    <!-- 筛选栏 -->
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

    <!-- 数据表格 -->
    <div class="flex-1 overflow-hidden">
      <n-data-table
        :columns="columns"
        :data="logs"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: AccessLog) => row.id"
        remote
        size="small"
        class="h-full"
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
const timeRange = ref<TimeRangeValue>('1');
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
        h('div', { class: 'text-slate-300' }, date.toLocaleDateString('zh-CN')),
        h('div', { class: 'text-slate-500' }, date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
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
          h('div', { class: 'text-slate-200 text-sm font-medium' }, displayText),
          h('div', { class: 'text-slate-500 text-xs' }, row.path),
        ]);
      }
      return h('span', { class: 'text-slate-200 text-sm' }, displayText);
    },
  },
  {
    title: 'IP',
    key: 'ip',
    width: 120,
    render(row) {
      return h('span', { class: 'font-mono text-xs text-slate-400' }, row.ip || '-');
    },
  },
  {
    title: '来源',
    key: 'referer',
    width: 140,
    ellipsis: { tooltip: true },
    render(row) {
      if (!row.referer) return h('span', { class: 'text-slate-500' }, '-');
      try {
        const url = new URL(row.referer);
        return h('span', { class: 'text-xs text-blue-400' }, url.hostname);
      } catch {
        return h('span', { class: 'text-xs text-slate-400 truncate' }, row.referer);
      }
    },
  },
  {
    title: '设备',
    key: 'userAgent',
    width: 160,
    render(row) {
      const { browser, os } = parseUserAgent(row.userAgent);
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'text-xs text-slate-300' }, browser),
        h('span', { class: 'text-slate-600' }, '/'),
        h('span', { class: 'text-xs text-slate-500' }, os)
      ]);
    },
  },
];

// 解析 User-Agent
function parseUserAgent(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: '-', os: '-' };

  let browser = '未知';
  let os = '未知';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { browser, os };
}

// 根据时间范围计算日期
function getDateRangeByDays(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days + 1);

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
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
  timeRange.value = '1';
  filters.value = {
    path: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = null;
  pagination.value.page = 1;
  applyTimeRange('1');
  fetchLogs();
}

// 日期变化
function handleDateChange(value: [number, number] | null) {
  if (value) {
    filters.value.startDate = new Date(value[0]).toISOString().split('T')[0];
    filters.value.endDate = new Date(value[1]).toISOString().split('T')[0];
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
