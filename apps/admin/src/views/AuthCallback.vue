<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden">
    <!-- 背景装饰 -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />
      <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-[120px]" />
    </div>

    <div class="glass-card p-10 text-center relative z-10">
      <div class="relative">
        <!-- 旋转光环 -->
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
        <!-- 中心图标 -->
        <div class="w-16 h-16 flex items-center justify-center">
          <Icon icon="mdi:github" class="text-3xl text-slate-400" />
        </div>
      </div>
      <p class="mt-6 text-slate-300 font-medium">正在登录...</p>
      <p class="mt-2 text-sm text-slate-500">请稍候，正在验证您的身份</p>
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
    router.push('/')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '登录失败'
    message.error(errorMessage)
    router.push('/login')
  }
})
</script>
