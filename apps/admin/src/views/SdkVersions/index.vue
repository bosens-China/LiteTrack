<template>
  <div class="sdk-shell">
    <div v-if="loading" class="state-center">
      <el-skeleton :rows="6" animated />
    </div>

    <div v-else-if="error" class="state-center">
      <el-empty description="无法加载版本列表">
        <template #image>
          <Icon icon="mdi:alert-circle-outline" class="error-icon" />
        </template>
        <el-button @click="load">重试</el-button>
      </el-empty>
    </div>

    <template v-else>
      <div class="sdk-layout">
        <VersionList
          :versions="manifest.versions"
          :channels="manifest.channels"
          :npm-info="npmInfo"
          :npm-loading="npmLoading"
          :selected="selected"
          @select="selected = $event"
        />
        <VersionDetail
          v-if="selected"
          :version="selected"
          :is-on-npm="isOnNpm(selected.version)"
          :npm-loading="npmLoading"
        />
        <div v-else class="detail-empty">
          <Icon icon="mdi:package-variant-closed" class="detail-empty-icon" />
          <p>选择左侧版本查看详情</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Icon } from '@iconify/vue';
import VersionList from './VersionList.vue';
import VersionDetail from './VersionDetail.vue';
import type { Manifest, NpmInfo, SdkVersion } from './types';

const loading = ref(false);
const error = ref(false);
const manifest = ref<Manifest>({ channels: {}, versions: [] });
const selected = ref<SdkVersion | null>(null);
const npmInfo = ref<NpmInfo | null>(null);
const npmLoading = ref(false);

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const res = await fetch('/sdk/manifest.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest.value = (await res.json()) as Manifest;
    if (manifest.value.versions.length > 0) {
      selected.value = manifest.value.versions[0];
    }
    void loadNpm();
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadNpm() {
  npmLoading.value = true;
  try {
    const res = await fetch('https://registry.npmjs.org/@boses/litetrack-sdk');
    if (!res.ok) throw new Error();
    npmInfo.value = (await res.json()) as NpmInfo;
  } catch {
    npmInfo.value = null;
  } finally {
    npmLoading.value = false;
  }
}

function isOnNpm(version: string): boolean {
  return npmInfo.value?.versions[version] !== undefined;
}

onMounted(load);
</script>

<style scoped>
.sdk-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.state-center {
  padding: 40px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
}

.error-icon {
  font-size: 48px;
  color: var(--color-danger, #f56c6c);
}

.sdk-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bg-secondary);
}

.detail-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-muted);
  font-size: 14px;
}

.detail-empty-icon {
  font-size: 40px;
  opacity: 0.4;
}
</style>
