<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="logo-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 128 128">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="128" height="128" rx="24" fill="url(#bg)" />
          <rect x="28" y="60" width="20" height="40" rx="4" fill="rgba(255,255,255,0.9)" />
          <rect x="54" y="40" width="20" height="60" rx="4" fill="rgba(255,255,255,0.7)" />
          <rect x="80" y="25" width="20" height="75" rx="4" fill="rgba(255,255,255,0.5)" />
        </svg>
      </div>
      <h1 class="title">404</h1>
      <p class="subtitle">页面找不到了</p>
      <p class="description">您访问的页面可能已被移除、更名或暂时不可用</p>
      <n-button type="primary" size="large" @click="router.push('/')">
        <template #icon>
          <Icon icon="mdi:home" />
        </template>
        返回首页
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { Icon } from '@iconify/vue'

const router = useRouter()
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.not-found-content {
  text-align: center;
  background: white;
  padding: 60px 80px;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.logo-icon {
  margin-bottom: 24px;
}

.title {
  font-size: 120px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin: 0 0 16px 0;
}

.subtitle {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 12px 0;
}

.description {
  font-size: 16px;
  color: #6b7280;
  margin: 0 0 32px 0;
  max-width: 400px;
}

@media (max-width: 640px) {
  .not-found-content {
    padding: 40px 32px;
  }
  
  .title {
    font-size: 80px;
  }
  
  .subtitle {
    font-size: 22px;
  }
}
</style>
