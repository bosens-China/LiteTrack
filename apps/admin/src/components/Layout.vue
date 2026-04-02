<template>
  <n-layout has-sider class="admin-shell">
    <n-layout-sider
      collapse-mode="width"
      :collapsed-width="72"
      :width="252"
      :collapsed="collapsed"
      show-trigger
      class="sidebar"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sidebar-header">
        <div v-if="!collapsed" class="logo-full">
          <div class="logo-mark">
            <Icon icon="mdi:chart-box-outline" class="text-xl" />
          </div>
          <div class="min-w-0">
            <div class="logo-text">LiteTrack</div>
            <div class="logo-subtitle">Admin Console</div>
          </div>
        </div>
        <div v-else class="logo-mark">
          <Icon icon="mdi:chart-box-outline" class="text-xl" />
        </div>
      </div>

      <div class="sidebar-section">
        <div v-if="!collapsed" class="sidebar-caption">导航</div>
        <n-menu
          :collapsed="collapsed"
          :collapsed-width="72"
          :collapsed-icon-size="20"
          :options="menuOptions"
          :value="activeKey"
          class="sidebar-menu"
          @update:value="handleMenuSelect"
        />
      </div>
    </n-layout-sider>

    <n-layout class="main-layout" :style="mainLayoutOffsetStyle">
      <n-layout-header bordered class="header">
        <div class="header-main">
          <div class="header-title-group">
            <div class="header-badge">
              <Icon icon="mdi:view-dashboard-outline" />
            </div>
            <div>
              <h2 class="header-title">{{ pageTitle }}</h2>
              <p class="header-subtitle">LiteTrack 访问统计后台</p>
            </div>
          </div>

          <div class="header-actions">
            <button class="btn-glass text-sm" @click="openSdkDistPage">
              <Icon icon="mdi:download-outline" />
              SDK 目录
            </button>

            <n-dropdown :options="userOptions" @select="handleUserAction">
              <div class="user-trigger">
                <n-avatar
                  round
                  size="small"
                  :src="authStore.avatar || undefined"
                  :fallback-src="`https://ui-avatars.com/api/?name=${authStore.username}&background=2563EB&color=fff`"
                />
                <div v-if="authStore.username" class="user-info">
                  <span class="user-name">{{ authStore.username }}</span>
                  <span class="user-role">管理员</span>
                </div>
                <Icon icon="mdi:chevron-down" class="user-chevron" />
              </div>
            </n-dropdown>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content class="content" :native-scrollbar="false">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
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

/** 侧栏 fixed 后主区域左侧留白，与 sider 宽度一致 */
const mainLayoutOffsetStyle = computed(() => ({
  marginLeft: collapsed.value ? '72px' : '252px',
  transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  minWidth: 0,
}))
const SDK_DIST_URL =
  'https://github.com/bosens-China/LiteTrack/tree/master/apps/sdk/dist'

const menuOptions: MenuOption[] = [
  {
    label: '仪表盘',
    key: 'Dashboard',
    icon: () => h(Icon, { icon: 'mdi:view-dashboard', class: 'text-lg' }),
  },
  {
    label: '网站管理',
    key: 'Sites',
    icon: () => h(Icon, { icon: 'mdi:web', class: 'text-lg' }),
  },
]

const activeKey = computed(() => {
  if (route.name === 'SiteDetail') {
    return 'Sites'
  }
  return route.name as string
})

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: '仪表盘',
    Sites: '网站管理',
    SiteDetail: '网站详情',
  }
  return titles[route.name as string] || 'LiteTrack'
})

const userOptions = [
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(Icon, { icon: 'mdi:logout' }),
  },
]

function handleMenuSelect(key: string) {
  void router.push({ name: key })
}

function handleUserAction(key: string) {
  if (key === 'logout') {
    authStore.logout()
    void router.push('/login')
  }
}

function openSdkDistPage() {
  window.open(SDK_DIST_URL, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.admin-shell {
  position: relative;
  min-height: 100vh;
}

.main-layout {
  min-width: 0;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

/* 顶栏 + 可滚动内容区：由 scroll-container 承担纵向 flex */
.main-layout :deep(.n-layout-scroll-container) {
  display: flex !important;
  flex-direction: column;
  height: 100% !important;
  min-height: 0 !important;
  overflow: hidden !important;
}

.sidebar {
  position: fixed !important;
  top: 0;
  left: 0;
  bottom: 0;
  height: 100vh;
  z-index: 100;
  border-right: 1px solid var(--border-soft);
}

.sidebar-header {
  height: 76px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border-soft);
}

.logo-full {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: var(--text-inverse);
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.logo-subtitle {
  font-size: 12px;
  color: var(--text-muted);
}

.sidebar-section {
  padding: 16px 12px;
}

.sidebar-caption {
  padding: 0 8px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.header {
  flex-shrink: 0;
  height: 76px;
  padding: 0 24px;
  z-index: 20;
  background: var(--bg-secondary);
}

.header-main {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: var(--bg-brand-soft);
  color: var(--accent-blue);
}

.header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-subtitle {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-soft);
  background: #ffffff;
  transition: background-color 0.2s ease;
}

.user-trigger:hover {
  background: var(--bg-tertiary);
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.user-role {
  font-size: 12px;
  color: var(--text-muted);
}

.user-chevron {
  color: var(--text-muted);
}

.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  background: transparent;
}

:deep(.sidebar-menu) {
  --n-item-height: 46px;
}

:deep(.sidebar-menu .n-menu-item) {
  margin-bottom: 4px;
}

:deep(.sidebar-menu .n-menu-item-content) {
  border-radius: 12px;
}

:deep(.sidebar-menu .n-menu-item-content:hover) {
  background: #eef4ff !important;
}

:deep(.sidebar-menu .n-menu-item-content--selected) {
  background: #eaf2ff !important;
  color: var(--accent-blue) !important;
}

:deep(.sidebar-menu .n-menu-item-content--selected::before) {
  display: none;
}

:deep(.sidebar-menu .n-menu-item-content__icon) {
  color: inherit !important;
}

@media (max-width: 768px) {
  .header {
    padding: 0 16px;
  }

  .content {
    padding: 16px;
  }

  .user-info,
  .header-subtitle {
    display: none;
  }
}
</style>
