<template>
  <div class="version-list">
    <div class="list-header">
      <span class="list-title">版本历史</span>
      <span class="list-count">{{ versions.length }} 个版本</span>
    </div>

    <div class="list-body">
      <button
        v-for="(v, idx) in versions"
        :key="v.version"
        class="version-item"
        :class="{ 'is-active': selected?.version === v.version }"
        @click="$emit('select', v)"
      >
        <!-- 时间线竖线 -->
        <div class="timeline-track">
          <div class="timeline-dot" :class="{ 'dot-latest': idx === 0 }" />
          <div v-if="idx < versions.length - 1" class="timeline-line" />
        </div>

        <div class="item-body">
          <div class="item-top">
            <span class="item-version">v{{ v.version }}</span>
            <div class="item-badges">
              <span v-if="npmLoading" class="badge badge-loading" />
              <span v-else-if="isOnNpm(v.version)" class="badge badge-npm"
                >npm</span
              >
            </div>
          </div>
          <div class="item-meta">
            <span>API {{ v.apiVersion }}</span>
            <span class="meta-sep">·</span>
            <span>{{ formatBytes(v.size) }}</span>
          </div>
        </div>
      </button>

      <div v-if="versions.length === 0" class="empty-hint">暂无版本</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChannelInfo, NpmInfo, SdkVersion } from './types';

const props = defineProps<{
  versions: SdkVersion[];
  channels: Record<string, ChannelInfo>;
  npmInfo: NpmInfo | null;
  npmLoading: boolean;
  selected: SdkVersion | null;
}>();

defineEmits<{ select: [v: SdkVersion] }>();

function isOnNpm(version: string): boolean {
  return props.npmInfo?.versions[version] !== undefined;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}
</script>

<style scoped>
.version-list {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}

.list-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.list-count {
  font-size: 11px;
  color: var(--text-muted);
}

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.version-item {
  display: flex;
  align-items: flex-start;
  gap: 0;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.version-item:hover {
  background: var(--bg-tertiary);
}

.version-item.is-active {
  background: color-mix(in srgb, var(--accent-blue) 8%, transparent);
}

.version-item.is-active .item-version {
  color: var(--accent-blue);
}

/* 时间线 */
.timeline-track {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 0;
  width: 40px;
  flex-shrink: 0;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-soft);
  border: 2px solid var(--bg-secondary);
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}

.timeline-dot.dot-latest {
  width: 10px;
  height: 10px;
  background: var(--accent-blue);
}

.version-item.is-active .timeline-dot {
  background: var(--accent-blue);
}

.timeline-line {
  width: 2px;
  flex: 1;
  min-height: 20px;
  background: var(--border-soft);
  margin-top: 4px;
}

/* item body */
.item-body {
  flex: 1;
  min-width: 0;
  padding: 10px 12px 12px 0;
}

.item-top {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.item-version {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: ui-monospace, monospace;
}

.item-badges {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
}

/* npm：中性灰胶囊 + 红色小圆点（保留品牌识别，不用大块彩色） */
.badge-npm {
  gap: 4px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-npm::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-rose);
}

.badge-loading {
  width: 28px;
  height: 16px;
  background: var(--bg-tertiary);
  border-radius: 99px;
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-muted);
}

.meta-sep {
  opacity: 0.4;
}

.empty-hint {
  padding: 24px 16px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}
</style>
