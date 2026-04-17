<template>
  <div class="login-page">
    <div class="login-panel glass-card">
      <div class="login-brand">
        <div class="login-mark">
          <Icon icon="mdi:chart-box-outline" class="text-3xl text-white" />
        </div>
        <div>
          <h1 class="login-title">LiteTrack Admin</h1>
          <p class="login-subtitle">统一管理站点、访问趋势和访问令牌</p>
        </div>
      </div>

      <div class="login-card">
        <div class="login-card__content">
          <h2 class="login-card__title">使用 GitHub 登录</h2>
          <p class="login-card__text">登录后可进入仪表盘、查看站点趋势并管理访问令牌。</p>
        </div>

        <button
          class="w-full btn-primary py-3 rounded-xl text-base"
          :disabled="loading"
          @click="handleLogin"
        >
          <Icon v-if="loading" icon="mdi:loading" class="text-xl animate-spin" />
          <Icon v-else icon="mdi:github" class="text-xl" />
          <span>{{ loading ? '登录中...' : '使用 GitHub 登录' }}</span>
        </button>
      </div>

      <p class="login-tips">
        登录即表示您同意使用 LiteTrack 管理后台。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import {
  buildGithubLoginUrl,
  createOAuthState,
  OAUTH_STATE_STORAGE_KEY,
  POST_LOGIN_REDIRECT_STORAGE_KEY,
} from '@/api/auth'

const route = useRoute()
const loading = ref(false)

function handleLogin() {
  loading.value = true
  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect.length > 0
      ? route.query.redirect
      : '/'
  const state = createOAuthState()

  localStorage.setItem(POST_LOGIN_REDIRECT_STORAGE_KEY, redirect)
  sessionStorage.setItem(OAUTH_STATE_STORAGE_KEY, state)

  const loginUrl = buildGithubLoginUrl(state)
  window.location.href = loginUrl
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-panel {
  width: min(520px, 100%);
  padding: 28px;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.login-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.login-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  color: var(--text-primary);
}

.login-subtitle {
  margin: 6px 0 0;
  color: var(--text-secondary);
}

.login-card {
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.login-card__content {
  margin-bottom: 18px;
}

.login-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.login-card__text {
  margin: 6px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.login-tips {
  margin: 16px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
