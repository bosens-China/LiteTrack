<template>
  <n-card title="访问日志">
    <!-- 筛选栏 -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <n-input
        v-model:value="filters.path"
        placeholder="搜索路径"
        clearable
        style="width: 160px"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <Icon icon="mdi:magnify" />
        </template>
      </n-input>

      <n-date-picker
        v-model:value="dateRange"
        type="daterange"
        clearable
        style="width: 220px"
        placeholder="选择日期范围"
        @update:value="handleDateChange"
      />

      <n-button type="primary" @click="handleSearch"> 查询 </n-button>
      <n-button @click="handleReset"> 重置 </n-button>
    </div>

    <!-- 数据表格 -->
    <n-data-table
      :columns="columns"
      :data="logs"
      :loading="loading"
      :pagination="pagination"
      :row-key="(row) => row.id"
      remote
      @update:page="handlePageChange"
      @update:page-size="handlePageSizeChange"
    />
  </n-card>
</template>

<script setup lang="ts">
import { h, ref, watch } from 'vue';
import {
  NCard,
  NInput,
  NButton,
  NDataTable,
  NDatePicker,
  useMessage,
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

// 筛选条件
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
    width: 180,
    render(row) {
      return new Date(row.createdAt).toLocaleString('zh-CN');
    },
  },
  {
    title: '页面',
    key: 'path',
    ellipsis: { tooltip: true },
    render(row) {
      return row.title
        ? h('div', [
            h('div', { class: 'font-medium' }, row.title),
            h('div', { class: 'text-gray-500 text-xs' }, row.path),
          ])
        : row.path;
    },
  },
  {
    title: 'IP',
    key: 'ip',
    width: 140,
    render(row) {
      return row.ip || '-';
    },
  },
  {
    title: '来源',
    key: 'referer',
    ellipsis: { tooltip: true },
    render(row) {
      if (!row.referer) return '-';
      try {
        const url = new URL(row.referer);
        return url.hostname;
      } catch {
        return row.referer;
      }
    },
  },
  {
    title: '设备',
    key: 'userAgent',
    width: 200,
    ellipsis: { tooltip: true },
    render(row) {
      return parseUserAgent(row.userAgent);
    },
  },
];

// 解析 User-Agent
function parseUserAgent(ua: string | null): string {
  if (!ua) return '-';

  // 简单解析，显示浏览器和系统
  let browser = '未知浏览器';
  let os = '未知系统';

  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} / ${os}`;
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
  },
);

const logs = ref<AccessLog[]>([]);

// 查询
function handleSearch() {
  pagination.value.page = 1;
  fetchLogs();
}

// 重置
function handleReset() {
  filters.value = {
    path: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = null;
  pagination.value.page = 1;
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
