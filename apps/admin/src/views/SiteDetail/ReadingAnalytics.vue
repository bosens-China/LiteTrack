<template>
  <section class="glass-card p-5 reading-analytics">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Icon icon="mdi:book-open-page-variant-outline" class="text-lg" />
        </div>
        <div>
          <h3 class="panel-title">阅读完成度</h3>
          <p class="panel-subtitle">观察读者是否真正读到内容中后段。</p>
        </div>
      </div>

      <n-radio-group v-model:value="timeRange" size="small" class="shrink-0">
        <n-radio-button value="7">7天</n-radio-button>
        <n-radio-button value="30">30天</n-radio-button>
        <n-radio-button value="90">90天</n-radio-button>
      </n-radio-group>
    </div>

    <div class="reading-analytics__toolbar">
      <n-input
        v-model:value="draftPath"
        clearable
        placeholder="按页面路径筛选，例如 /docs/getting-started"
        @keyup.enter="applyPathFilter"
      >
        <template #prefix>
          <Icon icon="mdi:map-marker-path" class="text-slate-400" />
        </template>
      </n-input>

      <div class="reading-analytics__actions">
        <button type="button" class="btn-primary px-3 py-2 rounded-lg text-sm" @click="applyPathFilter">
          筛选
        </button>
        <button type="button" class="btn-glass px-3 py-2 rounded-lg text-sm" @click="resetPathFilter">
          重置
        </button>
      </div>
    </div>

    <div v-if="currentPath" class="reading-analytics__filter-chip">
      <span>当前页面：{{ currentPath }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="metric-card metric-card-amber">
        <div class="metric-card__label">完成率</div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ formatPercent(summary.completionRate) }}</template>
          <n-skeleton v-else text style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">完成定义：阅读深度达到 75%</p>
      </div>

      <div class="metric-card metric-card-sky">
        <div class="metric-card__label">平均深度</div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ formatDepth(summary.averageDepth) }}</template>
          <n-skeleton v-else text style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">样本 {{ formatNumber(summary.totalReaders) }} 人次</p>
      </div>

      <div class="metric-card metric-card-emerald">
        <div class="metric-card__label">观察区间</div>
        <div class="metric-card__value">
          <template v-if="!loading">{{ summary.days }} 天</template>
          <n-skeleton v-else text style="width: 60%; height: 32px" />
        </div>
        <p class="metric-card__hint">适合用于验证内容页质量</p>
      </div>
    </div>

    <n-empty
      v-if="!loading && summary.totalReaders === 0"
      description="暂无阅读完成度数据"
      class="reading-analytics__empty"
    >
      <template #icon>
        <Icon icon="mdi:book-remove-outline" class="text-5xl text-slate-400" />
      </template>
    </n-empty>

    <div v-else class="depth-panel">
      <div class="depth-panel__header">
        <span>深度漏斗</span>
        <span class="depth-panel__meta">逐级累计，便于看掉队位置</span>
      </div>

      <div class="depth-list">
        <template v-if="loading && !hasReadingStats">
          <div v-for="index in 4" :key="index" class="depth-row depth-row--loading">
            <n-skeleton text style="width: 80px" />
            <n-skeleton round style="height: 10px; flex: 1" />
            <n-skeleton text style="width: 56px" />
          </div>
        </template>

        <template v-else>
          <div v-for="step in depthSteps" :key="step.label" class="depth-row">
            <div class="depth-row__label">{{ step.label }}</div>
            <div class="depth-row__track">
              <div class="depth-row__fill" :style="getDepthStyle(step.count)" />
            </div>
            <div class="depth-row__value">{{ formatDepthCount(step.count) }}</div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { NEmpty, NInput, NRadioButton, NRadioGroup, NSkeleton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { formatNumber } from '@/utils'
import { useReadingAnalytics } from '@/composables/site-detail/useReadingAnalytics'

interface Props {
  siteId: number
}

const props = defineProps<Props>()

const {
  applyPathFilter,
  currentPath,
  depthSteps,
  draftPath,
  formatDepth,
  formatDepthCount,
  formatPercent,
  getDepthStyle,
  hasReadingStats,
  loading,
  resetPathFilter,
  summary,
  timeRange,
} = useReadingAnalytics(() => props.siteId)
</script>

<style scoped>
.reading-analytics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100%;
}

.reading-analytics__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
}

.reading-analytics__actions {
  display: flex;
  gap: 0.75rem;
}

.reading-analytics__filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.12);
  color: #92400e;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

.metric-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.82));
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

.metric-card-amber::after {
  background: radial-gradient(circle, rgba(251, 191, 36, 0.38), transparent 72%);
}

.metric-card-sky::after {
  background: radial-gradient(circle, rgba(14, 165, 233, 0.38), transparent 72%);
}

.metric-card-emerald::after {
  background: radial-gradient(circle, rgba(16, 185, 129, 0.38), transparent 72%);
}

.metric-card__label {
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

.reading-analytics__empty {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.depth-panel {
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(248, 250, 252, 0.55);
  padding: 1rem;
}

.depth-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
}

.depth-panel__meta {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
}

.depth-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.depth-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 96px;
  gap: 0.75rem;
  align-items: center;
}

.depth-row--loading {
  grid-template-columns: 88px minmax(0, 1fr) 56px;
}

.depth-row__label {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 600;
}

.depth-row__track {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  overflow: hidden;
}

.depth-row__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.72));
}

.depth-row__value {
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 767px) {
  .reading-analytics__toolbar {
    grid-template-columns: 1fr;
  }

  .reading-analytics__actions {
    width: 100%;
  }

  .reading-analytics__actions > button {
    flex: 1;
  }

  .depth-panel__header {
    flex-direction: column;
  }

  .depth-row {
    grid-template-columns: 76px minmax(0, 1fr) 80px;
    gap: 0.5rem;
  }
}
</style>
