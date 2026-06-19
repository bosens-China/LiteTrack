<template>
  <div class="sdk-page">
    <!-- 顶部说明 -->
    <div class="page-header">
      <h3 class="section-title">SDK 版本管理</h3>
      <p class="section-desc">
        所有 SDK 版本均托管在本服务上，每次发版通过 CI 自动发布。
        SDK 大版本与后端 API 版本对应（1.x → <code>/litetrack/v1</code>）。
      </p>
    </div>

    <!-- 加载态 -->
    <div v-if="loading" class="state-center">
      <el-skeleton :rows="4" animated />
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="state-center">
      <el-empty description="无法加载版本列表">
        <template #image>
          <Icon icon="mdi:alert-circle-outline" class="empty-icon error-icon" />
        </template>
        <el-button @click="load">重试</el-button>
      </el-empty>
    </div>

    <template v-else>
      <!-- channels 卡片 -->
      <div class="channels-row">
        <div
          v-for="(info, channel) in manifest.channels"
          :key="channel"
          class="channel-card"
        >
          <div class="channel-badge">{{ channel }}</div>
          <div class="channel-latest">
            <span class="channel-label">最新版本</span>
            <span class="channel-version">{{ info.latest }}</span>
          </div>
          <div class="channel-url">
            <code>{{ info.url }}</code>
          </div>
        </div>
      </div>

      <!-- 版本列表 -->
      <div class="versions-section">
        <h4 class="versions-title">所有版本（{{ manifest.versions.length }}）</h4>
        <div
          v-for="v in manifest.versions"
          :key="v.version"
          class="version-card"
        >
          <div class="version-head">
            <div class="version-meta">
              <span class="version-tag">v{{ v.version }}</span>
              <el-tag size="small" type="info" class="api-tag">
                API {{ v.apiVersion }}
              </el-tag>
              <span class="version-size">{{ formatBytes(v.size) }}</span>
            </div>
            <el-button
              size="small"
              class="copy-btn"
              @click="copySnippet(v)"
            >
              <Icon icon="mdi:content-copy" class="mr-1" />
              复制接入代码
            </el-button>
          </div>

          <!-- 嵌入代码预览 -->
          <div class="snippet-block">
            <pre class="snippet-code">{{ buildSnippet(v) }}</pre>
          </div>

          <!-- SRI / URL -->
          <div class="version-footer">
            <span class="integrity-label">URL：</span>
            <code class="integrity-value">{{ v.url }}</code>
          </div>
          <div class="version-footer">
            <span class="integrity-label">SRI：</span>
            <code class="integrity-value">{{ v.integrity }}</code>
          </div>
        </div>

        <el-empty
          v-if="manifest.versions.length === 0"
          description="暂无已发布的 SDK 版本"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { ElMessage } from 'element-plus'
import { useClipboard } from '@/composables/useClipboard'

interface ChannelInfo {
  latest: string
  url: string
}

interface SdkVersion {
  version: string
  apiVersion: string
  url: string
  integrity: string
  size: number
}

interface Manifest {
  channels: Record<string, ChannelInfo>
  versions: SdkVersion[]
}

const EMPTY_MANIFEST: Manifest = { channels: {}, versions: [] }

const loading = ref(false)
const error = ref(false)
const manifest = ref<Manifest>(EMPTY_MANIFEST)

const { copy } = useClipboard()

async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await fetch('/sdk/manifest.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    manifest.value = (await res.json()) as Manifest
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} kB`
}

function buildSnippet(v: SdkVersion): string {
  const origin = window.location.origin
  return `<script src="${origin}${v.url}" integrity="${v.integrity}" crossorigin="anonymous"><\/script>
<script>
  window.LiteTrack.create({
    siteToken: 'YOUR_SITE_TOKEN',
    baseUrl: '${origin}',
    autoPageview: true,
    autoReadProgress: true,
  })
<\/script>`
}

async function copySnippet(v: SdkVersion) {
  await copy(buildSnippet(v))
  ElMessage.success('接入代码已复制')
}

onMounted(load)
</script>

<style scoped>
.sdk-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
}

.section-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.section-desc code {
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--accent-blue);
}

.state-center {
  padding: 40px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
}

.empty-icon {
  font-size: 48px;
}

.error-icon {
  color: var(--color-danger, #f56c6c);
}

/* channels */
.channels-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.channel-card {
  flex: 1;
  min-width: 220px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 99px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  width: fit-content;
}

.channel-latest {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.channel-label {
  font-size: 12px;
  color: var(--text-muted);
}

.channel-version {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.channel-url code {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
}

/* versions */
.versions-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.versions-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.version-card {
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.version-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.version-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-tag {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}

.api-tag {
  font-size: 11px;
}

.version-size {
  font-size: 12px;
  color: var(--text-muted);
}

.copy-btn {
  flex-shrink: 0;
}

/* snippet */
.snippet-block {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  overflow: auto;
}

.snippet-code {
  margin: 0;
  padding: 12px 16px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  white-space: pre;
  font-family: 'Fira Mono', 'JetBrains Mono', ui-monospace, monospace;
}

/* footer rows */
.version-footer {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.integrity-label {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.integrity-value {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
}
</style>
