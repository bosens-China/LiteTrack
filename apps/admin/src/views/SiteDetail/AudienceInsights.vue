<template>
  <div class="flex flex-col gap-4">
    <VisitorSummary :site-id="siteId" />
    <div class="insights-grid">
      <DeviceAnalytics :site-id="siteId" />
      <ReadingAnalytics :site-id="siteId" />
      <ReferrersAnalytics :site-id="siteId" />
      <BounceCard :site-id="siteId" />
    </div>
    <DurationAnalytics :site-id="siteId" />
  </div>
</template>

<script setup lang="ts">
import BounceCard from './BounceCard.vue';
import DeviceAnalytics from './DeviceAnalytics.vue';
import DurationAnalytics from './DurationAnalytics.vue';
import ReadingAnalytics from './ReadingAnalytics.vue';
import ReferrersAnalytics from './ReferrersAnalytics.vue';
import VisitorSummary from './VisitorSummary.vue';

defineProps<{ siteId: number }>();
</script>

<style scoped>
.insights-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1440px) {
  .insights-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
</style>
