<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />
      <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-[120px]" />
    </div>

    <div class="glass-card max-w-md w-full space-y-8 p-8 relative z-10">
      <div class="text-center">
        <!-- Logo -->
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25">
          <Icon icon="mdi:chart-bar" class="text-3xl text-white" />
        </div>
        <h1 class="text-3xl font-bold gradient-text">LiteTrack</h1>
        <p class="mt-2 text-slate-400">网站访问统计分析平台</p>
      </div>

      <div class="mt-8">
        <button
          class="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-3 text-base"
          :disabled="loading"
          @click="handleLogin"
        >
          <Icon v-if="loading" icon="mdi:loading" class="text-xl animate-spin" />
          <Icon v-else icon="mdi:github" class="text-xl" />
          <span>{{ loading ? '登录中...' : '使用 GitHub 登录' }}</span>
        </button>
      </div>

      <p class="text-center text-xs text-slate-500">
        登录即表示您同意我们的服务条款
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Icon } from '@iconify/vue';

const loading = ref(false);

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || '/litetrack/v1';

function handleLogin() {
  loading.value = true;
  // 跳转到 GitHub OAuth 授权页面
  const loginUrl = `${API_BASE_URL.replace(/\/$/, '')}/auth/github`;
  window.location.href = loginUrl;
}
</script>
