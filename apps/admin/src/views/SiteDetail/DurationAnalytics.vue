<template>
  <el-card shadow="never" class="duration-analytics">
    <template #header>
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="panel-icon">
            <Icon icon="mdi:timer-outline" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">页面停留时长</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">
              访客在各页面的平均停留时间
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

    <div class="duration-analytics__meta">
      <span>最近 {{ days }} 天 · 按平均停留时长排序</span>
      <span>样本量 {{ formatNumber(totalSamples) }} 条</span>
    </div>

    <el-empty
      v-if="!loading && pages.length === 0"
      description="暂无停留时长数据"
      class="duration-analytics__empty"
    >
      <template #description>
        <p style="color: var(--text-muted); font-size: 0.8125rem">
          停留时长由 SDK 1.1.0+ 自动采集，升级 SDK 后此处将展示数据。
        </p>
      </template>
    </el-empty>

    <div v-else class="duration-panel">
      <div class="duration-list">
        <el-skeleton v-if="loading && pages.length === 0" animated>
          <template #template>
            <div
              v-for="index in 8"
              :key="index"
              class="duration-row duration-row--loading"
            >
              <el-skeleton-item variant="text" style="width: 50%" />
              <el-skeleton-item variant="rect" style="height: 8px; flex: 1" />
              <el-skeleton-item variant="text" style="width: 56px" />
            </div>
          </template>
        </el-skeleton>
        <template v-else>
          <div v-for="item in pages" :key="item.path" class="duration-row">
            <div class="duration-row__path">
              <span class="duration-row__pathname">{{ item.path }}</span>
              <span class="duration-row__samples"
                >{{ formatNumber(item.sampleCount) }} 次</span
              >
            </div>
            <div class="duration-row__track">
              <div
                class="duration-row__fill"
                :style="getBarStyle(item.avgDuration)"
              />
            </div>
            <div class="duration-row__value">
              {{ formatDuration(item.avgDuration) }}
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
import { getDurationStats, type DurationPageItem } from '@/api/stats';
import { formatNumber } from '@/utils';

type TimeRangeValue = '7' | '30' | '90';

const props = defineProps<{ siteId: number }>();

const timeRange = ref<TimeRangeValue>('30');
const pages = ref<DurationPageItem[]>([]);
const days = ref(30);

const { run: fetchDuration, loading } = useRequest(
  async () => {
    const res = await getDurationStats(props.siteId, {
      days: Number(timeRange.value),
    });
    pages.value = res.pages;
    days.value = res.summary.days;
    return res;
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(
        error instanceof Error ? error.message : '加载停留时长失败',
      );
    },
  },
);

const totalSamples = computed(() =>
  pages.value.reduce((sum, p) => sum + p.sampleCount, 0),
);
const maxDuration = computed(() =>
  pages.value.reduce((max, p) => Math.max(max, p.avgDuration), 0),
);

function getBarStyle(avgDuration: number): { width: string } {
  const width =
    maxDuration.value > 0
      ? Math.max((avgDuration / maxDuration.value) * 100, 6)
      : 0;
  return { width: `${Math.min(width, 100)}%` };
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0
    ? `${minutes} 分 ${remainingSeconds} 秒`
    : `${minutes} 分钟`;
}

watch(
  [() => props.siteId, timeRange],
  () => {
    void fetchDuration();
  },
  { immediate: true },
);
</script>

<style scoped>
.duration-analytics :deep(.el-card__body) {
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
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.duration-analytics__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.duration-analytics__empty {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.duration-panel {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(248, 250, 252, 0.55);
  padding: 1rem;
}

.duration-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.duration-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(80px, 120px) 80px;
  gap: 0.75rem;
  align-items: center;
}

.duration-row--loading {
  grid-template-columns: minmax(0, 1fr) 100px 56px;
}

.duration-row__path {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.duration-row__pathname {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duration-row__samples {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.duration-row__track {
  height: 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.duration-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(99, 102, 241, 0.9),
    rgba(79, 70, 229, 0.72)
  );
}

.duration-row__value {
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .duration-analytics__meta {
    flex-direction: column;
  }

  .duration-row {
    grid-template-columns: minmax(0, 1fr) 64px 64px;
    gap: 0.5rem;
  }
}
</style>
