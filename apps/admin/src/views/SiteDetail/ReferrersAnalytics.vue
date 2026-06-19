<template>
  <el-card shadow="never" class="referrers-analytics">
    <template #header>
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="panel-icon">
            <Icon icon="mdi:web" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">流量来源</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">
              来源域名聚合，direct 表示直接访问
            </div>
          </div>
        </div>
        <el-radio-group v-model="timeRange" size="small" class="shrink-0">
          <el-radio-button :value="'7'">7天</el-radio-button>
          <el-radio-button :value="'30'">30天</el-radio-button>
          <el-radio-button :value="'90'">90天</el-radio-button>
        </el-radio-group>
      </div>
    </template>

    <div class="referrers-analytics__meta">
      <span>最近 {{ days }} 天</span>
      <span>Top {{ referrers.length }} 来源</span>
    </div>

    <el-empty
      v-if="!loading && referrers.length === 0"
      description="暂无来源数据"
      class="referrers-analytics__empty"
    />

    <div v-else class="bucket-card">
      <div class="bucket-list">
        <el-skeleton v-if="loading && referrers.length === 0" animated>
          <template #template>
            <div
              v-for="index in 6"
              :key="index"
              class="bucket-row bucket-row--loading"
            >
              <el-skeleton-item variant="text" style="width: 40%" />
              <el-skeleton-item variant="rect" style="height: 8px; flex: 1" />
            </div>
          </template>
        </el-skeleton>
        <template v-else>
          <div v-for="item in referrers" :key="item.domain" class="bucket-row">
            <div class="bucket-row__topline">
              <span class="bucket-row__name">{{
                formatDomain(item.domain)
              }}</span>
              <span class="bucket-row__value">{{
                formatCountWithRatio(item.count)
              }}</span>
            </div>
            <div class="bucket-row__track">
              <div class="bucket-row__fill" :style="getBarStyle(item.count)" />
            </div>
          </div>
        </template>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useRequest } from 'vue-request';
import { getReferrersStats, type ReferrerItem } from '@/api/stats';
import { formatNumber } from '@/utils';

type TimeRangeValue = '7' | '30' | '90';

const props = defineProps<{ siteId: number }>();

const timeRange = ref<TimeRangeValue>('30');
const referrers = ref<ReferrerItem[]>([]);
const days = ref(30);

const { run: fetchReferrers, loading } = useRequest(
  async () => {
    const res = await getReferrersStats(props.siteId, {
      days: Number(timeRange.value),
    });
    referrers.value = res.referrers;
    days.value = res.summary.days;
    return res;
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(
        error instanceof Error ? error.message : '加载来源分析失败',
      );
    },
  },
);

const totalCount = computed(() =>
  referrers.value.reduce((sum, item) => sum + item.count, 0),
);
const maxCount = computed(() =>
  referrers.value.reduce((max, item) => Math.max(max, item.count), 0),
);

function getBarStyle(count: number): { width: string } {
  const width =
    maxCount.value > 0 ? Math.max((count / maxCount.value) * 100, 8) : 0;
  return { width: `${Math.min(width, 100)}%` };
}

function formatDomain(domain: string): string {
  return domain === 'direct' ? '直接访问' : domain;
}

function formatCountWithRatio(count: number): string {
  if (totalCount.value === 0) return formatNumber(count);
  const ratio = ((count / totalCount.value) * 100).toFixed(
    count / totalCount.value >= 0.1 ? 0 : 1,
  );
  return `${formatNumber(count)} / ${ratio}%`;
}

watch(
  [() => props.siteId, timeRange],
  () => {
    void fetchReferrers();
  },
  { immediate: true },
);
</script>

<style scoped>
.referrers-analytics :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.referrers-analytics__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.referrers-analytics__empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bucket-card {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 1rem;
  padding: 1rem;
  background: rgba(248, 250, 252, 0.55);
}

.bucket-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.bucket-row {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.bucket-row--loading {
  gap: 0.625rem;
}

.bucket-row__topline {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.bucket-row__name {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bucket-row__value {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  flex-shrink: 0;
}

.bucket-row__track {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.bucket-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(16, 185, 129, 0.9),
    rgba(5, 150, 105, 0.72)
  );
}
</style>
