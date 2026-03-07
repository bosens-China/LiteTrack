<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">LiteTrack</h1>
        <p class="mt-2 text-gray-600">网站访问统计分析平台</p>
      </div>
      
      <div class="mt-8">
        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          @click="handleLogin"
        >
          <template #icon>
            <Icon icon="mdi:github" class="text-xl" />
          </template>
          使用 GitHub 登录
        </n-button>
      </div>
      
      <p class="text-center text-sm text-gray-500">
        登录即表示您同意我们的服务条款
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui'
import { Icon } from '@iconify/vue'

const loading = ref(false)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/litetrack/v1'

function handleLogin() {
  loading.value = true
  // 跳转到 GitHub OAuth 授权页面
  const url = new URL(`${API_BASE_URL}/auth/github`)
  window.location.href = url.toString()
}
</script>
