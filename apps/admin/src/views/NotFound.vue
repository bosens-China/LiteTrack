<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="logo-icon">
        <div class="logo-mark">
          <Icon icon="mdi:chart-bar" class="text-4xl text-white" />
        </div>
      </div>
      
      <h1 class="title">404</h1>
      <p class="subtitle">页面找不到了</p>
      <p class="description">您访问的页面可能已被移除、更名或暂时不可用</p>
      
      <el-button type="primary" size="large" class="mx-auto" @click="router.push('/')">
        <Icon icon="mdi:home" class="mr-1" />
        返回首页
      </el-button>
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
  padding: 20px;
}

.not-found-content {
  text-align: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-soft);
  padding: 60px 80px;
  border-radius: 8px;
  box-shadow: var(--shadow-card-hover);
}

.logo-icon {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background: var(--accent-blue);
}

.title {
  font-size: 120px;
  font-weight: 800;
  color: var(--accent-blue);
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
