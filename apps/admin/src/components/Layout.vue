<template>
  <n-layout has-sider position="absolute">
    <!-- 侧边栏 -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sidebar-header">
        <template v-if="!collapsed">
          <div class="logo-full">
            <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 128 128">
              <defs>
                <linearGradient id="sidebarBg" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="128" height="128" rx="24" fill="url(#sidebarBg)" />
              <rect x="28" y="60" width="20" height="40" rx="4" fill="rgba(255,255,255,0.9)" />
              <rect x="54" y="40" width="20" height="60" rx="4" fill="rgba(255,255,255,0.7)" />
              <rect x="80" y="25" width="20" height="75" rx="4" fill="rgba(255,255,255,0.5)" />
            </svg>
            <span class="logo-text">LiteTrack</span>
          </div>
        </template>
        <template v-else>
          <svg class="logo-collapsed" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 128 128">
            <defs>
              <linearGradient id="sidebarBgCollapsed" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="128" height="128" rx="24" fill="url(#sidebarBgCollapsed)" />
            <rect x="28" y="60" width="20" height="40" rx="4" fill="rgba(255,255,255,0.9)" />
            <rect x="54" y="40" width="20" height="60" rx="4" fill="rgba(255,255,255,0.7)" />
            <rect x="80" y="25" width="20" height="75" rx="4" fill="rgba(255,255,255,0.5)" />
          </svg>
        </template>
      </div>
      
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>
    
    <!-- 主内容区 -->
    <n-layout>
      <!-- 顶部栏 -->
      <n-layout-header bordered class="h-16 px-4 flex items-center justify-between absolute top-0 left-0 right-0 z-50 bg-white">
        <h2 class="text-lg font-medium">{{ pageTitle }}</h2>
        <div class="flex items-center gap-2">
          <n-button quaternary @click="openSdkDistPage">
            <template #icon>
              <Icon icon="mdi:download-box" />
            </template>
            获取 SDK
          </n-button>

          <n-dropdown :options="userOptions" @select="handleUserAction">
            <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded">
              <n-avatar
                round
                size="small"
                :src="authStore.avatar || undefined"
                :fallback-src="`https://ui-avatars.com/api/?name=${authStore.username}&background=random`"
              />
              <span v-if="authStore.username">{{ authStore.username }}</span>
              <Icon icon="mdi:chevron-down" />
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>
      
      <!-- 内容 -->
      <n-layout-content class="p-6 absolute top-16 bottom-0 left-0 right-0" :native-scrollbar="false">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NAvatar,
  NButton,
  NDropdown,
  type MenuOption,
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)
const SDK_DIST_URL = 'https://github.com/bosens-China/LiteTrack/tree/master/apps/sdk/dist'

// 菜单配置
const menuOptions: MenuOption[] = [
  {
    label: '仪表盘',
    key: 'Dashboard',
    icon: () => h(Icon, { icon: 'mdi:view-dashboard' }),
  },
  {
    label: '网站管理',
    key: 'Sites',
    icon: () => h(Icon, { icon: 'mdi:web' }),
  },
]

// 当前激活的菜单
const activeKey = computed(() => route.name as string)

// 页面标题
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: '仪表盘',
    Sites: '网站管理',
    SiteDetail: '网站详情',
  }
  return titles[route.name as string] || 'LiteTrack'
})

// 用户下拉选项
const userOptions = [
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(Icon, { icon: 'mdi:logout' }),
  },
]

// 菜单选择
function handleMenuSelect(key: string) {
  router.push({ name: key })
}

// 用户操作
function handleUserAction(key: string) {
  if (key === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}

function openSdkDistPage() {
  window.open(SDK_DIST_URL, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.logo-full {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.logo-icon {
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 0.5px;
}

.logo-collapsed {
  flex-shrink: 0;
}
</style>
