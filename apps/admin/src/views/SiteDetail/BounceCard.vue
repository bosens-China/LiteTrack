<template>
  <el-card shadow="never" class="bounce-card">
    <template #header>
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <div class="panel-icon">
            <Icon icon="mdi:arrow-u-left-top" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">跳出率</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">
              仅浏览一页即离开的会话占比
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

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="metric-card" :class="bounceRateClass">
        <div class="metric-card__label">
          <Icon icon="mdi:exit-run" class="text-base" />
          <span>跳出率</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{
            formatPercent(summary.bounceRate)
          }}</template>
          <el-skeleton-item
            v-else
            variant="text"
            style="width: 60%; height: 32px"
          />
        </div>
        <p class="metric-card__hint">单页会话占总会话比例</p>
      </div>

      <div class="metric-card metric-card-sky">
        <div class="metric-card__label">
          <Icon icon="mdi:account-group-outline" class="text-base" />
          <span>总会话数</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{
            formatNumber(summary.totalSessions)
          }}</template>
          <el-skeleton-item
            v-else
            variant="text"
            style="width: 60%; height: 32px"
          />
        </div>
        <p class="metric-card__hint">最近 {{ summary.days }} 天</p>
      </div>

      <div class="metric-card metric-card-emerald">
        <div class="metric-card__label">
          <Icon icon="mdi:arrow-right-circle-outline" class="text-base" />
          <span>多页会话</span>
        </div>
        <div class="metric-card__value">
          <template v-if="!loading">{{
            formatNumber(summary.totalSessions - summary.bouncedSessions)
          }}</template>
          <el-skeleton-item
            v-else
            variant="text"
            style="width: 60%; height: 32px"
          />
        </div>
        <p class="metric-card__hint">浏览了 2+ 个页面的访客</p>
      </div>
    </div>

    <div class="bounce-tip" v-if="!loading && summary.totalSessions === 0">
      <Icon icon="mdi:information-outline" class="text-sm flex-shrink-0" />
      <span>暂无会话数据。请确认 SDK 已上报 sessionId。</span>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useRequest } from 'vue-request';
import { getBounceStats, type BounceStatsResponse } from '@/api/stats';
import { formatNumber } from '@/utils';

type TimeRangeValue = '7' | '30' | '90';

const props = defineProps<{ siteId: number }>();

const timeRange = ref<TimeRangeValue>('30');
const bounceData = ref<BounceStatsResponse | null>(null);

const { run: fetchBounce, loading } = useRequest(
  async () => {
    const res = await getBounceStats(props.siteId, {
      days: Number(timeRange.value),
    });
    bounceData.value = res;
    return res;
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(
        error instanceof Error ? error.message : '加载跳出率失败',
      );
    },
  },
);

const summary = computed(
  () =>
    bounceData.value?.summary ?? {
      days: Number(timeRange.value),
      totalSessions: 0,
      bouncedSessions: 0,
      bounceRate: 0,
    },
);

const bounceRateClass = computed(() => {
  const rate = summary.value.bounceRate;
  if (rate < 0.4) return 'metric-card-emerald';
  if (rate < 0.7) return 'metric-card-amber';
  return 'metric-card-rose';
});

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

watch(
  [() => props.siteId, timeRange],
  () => {
    void fetchBounce();
  },
  { immediate: true },
);
</script>

<style scoped>
.bounce-card :deep(.el-card__body) {
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
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.metric-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.92),
    rgba(248, 250, 252, 0.82)
  );
}

.metric-card::after {
  content: '';
  position: absolute;
  inset: auto -32px -42px auto;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  opacity: 0.45;
  pointer-events: none;
}

.metric-card-emerald::after {
  background: radial-gradient(circle, rgba(52, 211, 153, 0.4), transparent 72%);
}

.metric-card-amber::after {
  background: radial-gradient(
    circle,
    rgba(251, 191, 36, 0.38),
    transparent 72%
  );
}

.metric-card-rose::after {
  background: radial-gradient(
    circle,
    rgba(251, 113, 133, 0.38),
    transparent 72%
  );
}

.metric-card-sky::after {
  background: radial-gradient(circle, rgba(56, 189, 248, 0.4), transparent 72%);
}

.metric-card__label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.metric-card__value {
  margin-top: 0.75rem;
  color: var(--text-primary);
  font-size: 1.875rem;
  line-height: 1;
  font-weight: 700;
}

.metric-card__hint {
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.bounce-tip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  background: rgba(148, 163, 184, 0.08);
  color: var(--text-muted);
  font-size: 0.75rem;
}
</style>
