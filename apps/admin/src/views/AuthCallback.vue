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
import { loginWithGithub } from '@/api/auth'

const REDIRECT_STORAGE_KEY = 'litetrack:post-login-redirect'
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

onMounted(async () => {
  const code = route.query.code as string
  
  if (!code) {
    message.error('登录失败：缺少授权码')
    router.push('/login')
    return
  }
  
  try {
    const { token, user } = await loginWithGithub(code)
    authStore.setToken(token)
    authStore.setUser(user)
    message.success('登录成功')
    const redirect = localStorage.getItem(REDIRECT_STORAGE_KEY) || '/'
    localStorage.removeItem(REDIRECT_STORAGE_KEY)
    await router.push(redirect)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '登录失败'
    localStorage.removeItem(REDIRECT_STORAGE_KEY)
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
