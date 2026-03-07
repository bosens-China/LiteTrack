<template>
  <n-layout has-sider class="min-h-screen">
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
      <div class="h-16 flex items-center justify-center border-b">
        <span v-if="!collapsed" class="text-lg font-bold">LiteTrack</span>
        <Icon v-else icon="mdi:chart-line" class="text-2xl" />
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
      <n-layout-header bordered class="h-16 px-4 flex items-center justify-between">
        <h2 class="text-lg font-medium">{{ pageTitle }}</h2>
        
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
      </n-layout-header>
      
      <!-- 内容 -->
      <n-layout-content class="p-6">
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
  NDropdown,
  type MenuOption,
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const collapsed = ref(false)

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
    NewSite: '创建网站',
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
</script>
