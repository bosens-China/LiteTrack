<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <n-spin size="large" />
      <p class="mt-4 text-gray-600">正在登录...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSpin, useMessage } from 'naive-ui'
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
