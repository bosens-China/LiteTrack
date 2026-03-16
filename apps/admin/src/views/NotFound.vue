<template>
  <div class="not-found-container">
    <!-- 背景装饰 -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
      <div class="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/10 rounded-full blur-[120px]" />
      <div class="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-violet-500/10 rounded-full blur-[120px]" />
    </div>

    <div class="not-found-content">
      <!-- Logo -->
      <div class="logo-icon">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Icon icon="mdi:chart-bar" class="text-4xl text-white" />
        </div>
      </div>
      
      <h1 class="title">404</h1>
      <p class="subtitle">页面找不到了</p>
      <p class="description">您访问的页面可能已被移除、更名或暂时不可用</p>
      
      <button 
        class="btn-primary px-8 py-3 rounded-xl font-medium flex items-center gap-2 mx-auto"
        @click="router.push('/')"
      >
        <Icon icon="mdi:home" />
        返回首页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

const router = useRouter()
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  padding: 20px;
  position: relative;
}

.not-found-content {
  text-align: center;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-glass);
  padding: 60px 80px;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;
}

.logo-icon {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.title {
  font-size: 120px;
  font-weight: 800;
  background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin: 0 0 16px 0;
}

.subtitle {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.description {
  font-size: 16px;
  color: var(--text-secondary);
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
