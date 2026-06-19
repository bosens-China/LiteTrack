<template>
  <div class="detail">
    <!-- 版本头部 -->
    <div class="detail-header">
      <div class="header-left">
        <h2 class="ver-title">v{{ version.version }}</h2>
        <div class="ver-badges">
          <el-tag type="info" size="small">API {{ version.apiVersion }}</el-tag>
          <el-tag v-if="isOnNpm" type="success" size="small">
            <Icon icon="mdi:npm" class="tag-icon" />npm 已发布
          </el-tag>
          <el-tag v-else-if="!npmLoading" size="small" type="warning"
            >仅 CDN</el-tag
          >
          <span class="ver-size">{{ formatBytes(version.size) }}</span>
        </div>
      </div>
    </div>

    <div class="detail-body">
      <!-- 安装方式 -->
      <section class="section">
        <h3 class="section-title">安装方式</h3>
        <el-tabs v-model="installTab" class="install-tabs">
          <!-- npm tab -->
          <el-tab-pane name="npm" :disabled="!isOnNpm && !npmLoading">
            <template #label>
              <span :class="{ 'tab-disabled': !isOnNpm && !npmLoading }">
                <Icon icon="mdi:npm" class="tab-icon" />npm
              </span>
            </template>
            <div v-if="!isOnNpm && !npmLoading" class="npm-unavailable">
              <Icon icon="mdi:information-outline" class="mr-1" />
              该版本尚未发布到 npm，请使用 CDN 方式
            </div>
            <template v-else>
              <CodeBlock
                :code="npmInstallCmd"
                lang="bash"
                @copy="copyText(npmInstallCmd)"
              />
              <CodeBlock
                :code="npmUsageCode"
                lang="typescript"
                class="mt-12"
                @copy="copyText(npmUsageCode)"
              />
            </template>
          </el-tab-pane>

          <!-- CDN tab -->
          <el-tab-pane label="CDN 嵌入" name="cdn">
            <CodeBlock
              :code="cdnSnippet"
              lang="html"
              @copy="copyText(cdnSnippet)"
            />
          </el-tab-pane>
        </el-tabs>
      </section>

      <!-- 配置项 -->
      <section class="section">
        <h3 class="section-title">配置项</h3>
        <p class="section-desc">传给 <code>create()</code> 的选项对象。</p>
        <table class="config-table">
          <thead>
            <tr>
              <th>参数</th>
              <th>类型</th>
              <th>必填</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="opt in configOptions" :key="opt.name">
              <td>
                <code class="param">{{ opt.name }}</code>
              </td>
              <td>
                <code class="type">{{ opt.type }}</code>
              </td>
              <td class="required">{{ opt.required ? '✓' : '—' }}</td>
              <td class="desc">{{ opt.desc }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- API 方法 -->
      <section class="section">
        <h3 class="section-title">API 方法</h3>
        <div class="method-list">
          <div v-for="m in methods" :key="m.sig" class="method-item">
            <code class="method-sig">{{ m.sig }}</code>
            <p class="method-desc">{{ m.desc }}</p>
          </div>
        </div>
      </section>

      <!-- SPA 集成 -->
      <section class="section">
        <h3 class="section-title">SPA 集成示例</h3>
        <p class="section-desc">在 Vue Router 中自动上报每次路由跳转。</p>
        <CodeBlock
          :code="spaExample"
          lang="typescript"
          @copy="copyText(spaExample)"
        />
      </section>

      <!-- 阅读深度 -->
      <section class="section">
        <h3 class="section-title">阅读深度追踪</h3>
        <p class="section-desc">监听滚动位置，上报用户阅读到的百分比。</p>
        <CodeBlock
          :code="readExample"
          lang="typescript"
          @copy="copyText(readExample)"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { ElMessage } from 'element-plus';
import { useClipboard } from '@/composables/useClipboard';
import CodeBlock from './CodeBlock.vue';
import type { SdkVersion } from './types';

const props = defineProps<{
  version: SdkVersion;
  isOnNpm: boolean;
  npmLoading: boolean;
}>();

const installTab = ref(props.isOnNpm ? 'npm' : 'cdn');
const { copy } = useClipboard();

watch(
  () => props.isOnNpm,
  (on) => {
    if (on) installTab.value = 'npm';
  },
);

watch(
  () => props.version.version,
  () => {
    installTab.value = props.isOnNpm ? 'npm' : 'cdn';
  },
);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}

async function copyText(text: string) {
  await copy(text);
  ElMessage.success('已复制');
}

const NPM_PKG = '@boses/litetrack-sdk';

const npmInstallCmd = computed(
  () => `npm install ${NPM_PKG}@${props.version.version}`,
);

const npmUsageCode = computed(
  () => `import { create } from '${NPM_PKG}'

const tracker = create({
  siteToken: 'YOUR_SITE_TOKEN',
  baseUrl: 'https://your-server.com',
})

tracker.page()   // 上报当前页面访问`,
);

const cdnSnippet = computed(() => {
  const origin = window.location.origin;
  return `<script src="${origin}${props.version.url}"
        integrity="${props.version.integrity}"
        crossorigin="anonymous"><\/script>
<script>
  const tracker = LiteTrack.create({
    siteToken: 'YOUR_SITE_TOKEN',
    baseUrl: '${origin}',
  })
  tracker.page()
<\/script>`;
});

const spaExample = `import { createRouter } from 'vue-router'
import { create } from '${NPM_PKG}'

const tracker = create({
  siteToken: 'YOUR_SITE_TOKEN',
  baseUrl: 'https://your-server.com',
})

// 每次路由跳转后自动上报，实时读取当前路径和标题
router.afterEach(() => tracker.page())`;

const readExample = `function handleScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement
  const percent = Math.round(scrollTop / (scrollHeight - clientHeight) * 100)
  tracker.read(Math.min(percent, 100))
}

window.addEventListener('scroll', handleScroll, { passive: true })`;

const configOptions = [
  {
    name: 'siteToken',
    type: 'string',
    required: true,
    desc: '站点令牌，从管理界面的「令牌」标签页复制',
  },
  {
    name: 'baseUrl',
    type: 'string',
    required: true,
    desc: '后端服务地址，SDK 自动拼接版本前缀',
  },
  {
    name: 'debug',
    type: 'boolean',
    required: false,
    desc: '开启后将错误同步输出到 console.error，默认 false',
  },
  {
    name: 'identity',
    type: 'object',
    required: false,
    desc: '预设 visitorId / sessionId，适合已有用户体系时传入自己的 ID',
  },
  {
    name: 'onError',
    type: 'function',
    required: false,
    desc: 'fire-and-forget 上报失败时的回调，不影响主流程',
  },
];

const methods = [
  {
    sig: 'tracker.page(input?)',
    desc: '上报一次页面访问（PV）。不传参数时实时读取当前路径和标题，直接用在 SPA 路由钩子里无需额外传值。',
  },
  {
    sig: 'tracker.read(percent | { path, percent })',
    desc: '上报阅读深度，百分比范围 0–100，超出自动 clamp。支持简写形式直接传数字。',
  },
  {
    sig: 'tracker.identify({ visitorId?, sessionId? })',
    desc: '更新访客或会话身份。只需传变更的字段，未传的字段保持不变。',
  },
  {
    sig: 'tracker.stats.site()',
    desc: '查询站点整体统计，返回 Promise<{ totalViews, totalPages }>。',
  },
  {
    sig: 'tracker.stats.page(path)',
    desc: '查询指定路径的 PV，返回 Promise<{ path, count }>。',
  },
  {
    sig: 'tracker.destroy()',
    desc: '销毁追踪器，后续所有调用静默忽略。适合在 SPA 组件卸载时调用。',
  },
];
</script>

<style scoped>
.detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.ver-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: ui-monospace, monospace;
}

.ver-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-icon {
  font-size: 14px;
  margin-right: 3px;
  vertical-align: -2px;
}

.ver-size {
  font-size: 12px;
  color: var(--text-muted);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* sections */
.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-soft);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.section-desc code {
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--accent-blue);
}

/* install tabs */
.install-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.tab-icon {
  font-size: 16px;
  margin-right: 4px;
  vertical-align: -2px;
}

.tab-disabled {
  opacity: 0.45;
}

.npm-unavailable {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.mt-12 {
  margin-top: 12px;
}

/* config table */
.config-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.config-table th,
.config-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-soft);
}

.config-table th {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--bg-tertiary);
}

.config-table td.required {
  color: var(--accent-blue);
  font-weight: 700;
  text-align: center;
}

.config-table td.desc {
  color: var(--text-secondary);
}

code.param {
  color: var(--accent-blue);
  background: color-mix(in srgb, var(--accent-blue) 10%, transparent);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

code.type {
  color: var(--text-secondary);
  background: var(--bg-tertiary);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

/* methods */
.method-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.method-item {
  padding: 12px 14px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-soft);
}

.method-sig {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: ui-monospace, monospace;
  margin-bottom: 4px;
}

.method-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.55;
}
</style>
