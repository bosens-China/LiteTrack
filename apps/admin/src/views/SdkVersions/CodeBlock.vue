<template>
  <div class="code-block">
    <div class="code-toolbar">
      <span class="code-lang">{{ lang }}</span>
      <el-button size="small" text class="copy-btn" @click="$emit('copy')">
        <Icon icon="mdi:content-copy" class="mr-1" />复制
      </el-button>
    </div>
    <pre class="code-pre"><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  code: string;
  lang: string;
}>();

defineEmits<{ copy: [] }>();
</script>

<style scoped>
.code-block {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  overflow: hidden;
}

.code-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-soft);
}

.code-lang {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.copy-btn {
  color: var(--text-muted);
  font-size: 12px;
  padding: 2px 6px;
}

.code-pre {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  background: var(--bg-secondary);
}

.code-pre code {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  font-family: 'Fira Mono', 'JetBrains Mono', ui-monospace, monospace;
  white-space: pre;
}
</style>
