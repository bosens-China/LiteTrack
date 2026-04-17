<template>
  <section class="audience-insights">
    <div class="glass-card p-5 insights-header">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <Icon icon="mdi:account-group-outline" class="text-xl" />
        </div>
        <div>
          <h3 class="panel-title">访客分析</h3>
          <p class="panel-subtitle">从 UV、设备结构与阅读深度三个角度查看站点质量。</p>
        </div>
      </div>
    </div>

    <VisitorSummary :site-id="siteId" />

    <div class="insights-grid">
      <DeviceAnalytics :site-id="siteId" />
      <ReadingAnalytics :site-id="siteId" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import DeviceAnalytics from './DeviceAnalytics.vue'
import ReadingAnalytics from './ReadingAnalytics.vue'
import VisitorSummary from './VisitorSummary.vue'

interface Props {
  siteId: number
}

defineProps<Props>()
</script>

<style scoped>
.audience-insights {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.insights-header {
  position: relative;
  overflow: hidden;
}

.insights-header::after {
  content: '';
  position: absolute;
  inset: auto -10% -65% auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.18), transparent 70%);
  pointer-events: none;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 1440px) {
  .insights-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
