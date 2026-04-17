<template>
  <div class="callback-page">
    <div class="callback-panel glass-card">
      <div class="callback-spinner">
        <div class="callback-spinner__ring" />
        <div class="callback-spinner__icon">
          <Icon icon="mdi:github" class="text-3xl" />
        </div>
      </div>
      <p class="callback-title">正在登录...</p>
      <p class="callback-text">请稍候，系统正在校验 GitHub 授权信息。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'
import {
  loginWithGithub,
  OAUTH_STATE_STORAGE_KEY,
  POST_LOGIN_REDIRECT_STORAGE_KEY,
} from '@/api/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const returnedState = typeof route.query.state === 'string' ? route.query.state : ''
  const storedState = sessionStorage.getItem(OAUTH_STATE_STORAGE_KEY) || ''
  
  if (!code || !returnedState) {
    message.error('登录失败：缺少授权参数')
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    await router.push('/login')
    return
  }

  if (!storedState || storedState !== returnedState) {
    message.error('登录失败：授权状态校验失败')
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    localStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
    await router.push('/login')
    return
  }
  
  try {
    const { token, user } = await loginWithGithub(code, returnedState)
    authStore.setToken(token)
    authStore.setUser(user)
    message.success('登录成功')
    const redirect = localStorage.getItem(POST_LOGIN_REDIRECT_STORAGE_KEY) || '/'
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    localStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
    await router.push(redirect)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '登录失败'
    sessionStorage.removeItem(OAUTH_STATE_STORAGE_KEY)
    localStorage.removeItem(POST_LOGIN_REDIRECT_STORAGE_KEY)
    message.error(errorMessage)
    await router.push('/login')
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.callback-panel {
  width: min(360px, 100%);
  padding: 32px 28px;
  text-align: center;
}

.callback-spinner {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
}

.callback-spinner__ring {
  position: absolute;
  inset: 0;
  border: 4px solid #dbeafe;
  border-top-color: #2563eb;
  border-radius: 999px;
  animation: spin 1s linear infinite;
}

.callback-spinner__icon {
  color: var(--accent-blue);
}

.callback-title {
  margin: 20px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.callback-text {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--text-secondary);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
