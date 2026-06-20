<template>
  <el-container class="admin-shell">
    <el-aside :width="collapsed ? '64px' : '232px'" class="sidebar">
      <div class="sidebar-header">
        <div class="logo-full">
          <div class="logo-mark">
            <Icon icon="mdi:chart-box-outline" class="text-xl" />
          </div>
          <div class="logo-title" :class="{ 'logo-title--hidden': collapsed }">
            <div class="logo-text">LiteTrack</div>
            <div class="logo-subtitle">Admin Console</div>
          </div>
        </div>
      </div>

      <el-menu
        :collapse="collapsed"
        :default-active="activeKey"
        class="sidebar-menu"
        @select="handleMenuSelect"
      >
        <el-menu-item
          v-for="item in menuOptions"
          :key="item.key"
          :index="item.key"
        >
          <Icon :icon="item.icon" class="menu-icon" />
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container class="main-layout">
      <el-header class="header">
        <div class="header-main">
          <div class="header-title-group">
            <el-button
              text
              class="collapse-btn"
              @click="collapsed = !collapsed"
            >
              <Icon
                :icon="collapsed ? 'mdi:menu' : 'mdi:menu-open'"
                class="text-xl"
              />
            </el-button>
            <div>
              <h2 class="header-title">{{ pageTitle }}</h2>
              <p class="header-subtitle">LiteTrack 访问统计后台</p>
            </div>
          </div>

          <div class="header-actions">
            <el-dropdown trigger="hover" @command="handleUserAction">
              <div class="user-trigger">
                <el-avatar
                  :size="32"
                  :src="authStore.avatar || avatarFallback"
                />
                <span v-if="authStore.username" class="user-name">{{
                  authStore.username
                }}</span>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">
                    <Icon icon="mdi:logout" class="mr-2" />
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const collapsed = ref(false);

interface MenuItem {
  label: string;
  key: string;
  icon: string;
}

const menuOptions: MenuItem[] = [
  { label: '仪表盘', key: 'Dashboard', icon: 'mdi:view-dashboard' },
  { label: '网站管理', key: 'Sites', icon: 'mdi:web' },
  { label: 'SDK 版本', key: 'SdkVersions', icon: 'mdi:package-variant-closed' },
];

const activeKey = computed(() => {
  if (route.name === 'SiteDetail') {
    return 'Sites';
  }
  return route.name as string;
});

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: '仪表盘',
    Sites: '网站管理',
    SiteDetail: '网站详情',
    SdkVersions: 'SDK 版本',
  };
  return titles[route.name as string] || 'LiteTrack';
});

const avatarFallback = computed(
  () =>
    `https://ui-avatars.com/api/?name=${authStore.username}&background=2563EB&color=fff`,
);

function handleMenuSelect(key: string) {
  void router.push({ name: key });
}

function handleUserAction(command: string) {
  if (command === 'logout') {
    authStore.logout();
    void router.push('/login');
  }
}
</script>

<style scoped>
.admin-shell {
  height: 100vh;
}

.sidebar {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-soft);
  transition: width 0.25s ease;
  overflow: hidden;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-soft);
  overflow: hidden;
}

.logo-full {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  width: 100%;
  overflow: hidden;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--accent-blue);
  color: var(--text-inverse);
}

.logo-title {
  overflow: hidden;
  max-width: 180px;
  opacity: 1;
  white-space: nowrap;
  min-width: 0;
  transition:
    max-width 0.25s ease,
    opacity 0.2s ease;
}

.logo-title--hidden {
  max-width: 0;
  opacity: 0;
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 11px;
  color: var(--text-muted);
}

.sidebar-menu {
  border-right: none;
  padding: 8px;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 100%;
}

.sidebar-menu .el-menu-item {
  height: 44px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.menu-icon {
  font-size: 20px;
  margin-right: 10px;
  flex-shrink: 0;
}

:deep(.el-menu--collapse .el-menu-item) {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 !important;
  width: 100%;
}

:deep(.el-menu--collapse) .menu-icon {
  margin-right: 0;
  font-size: 22px;
}

.main-layout {
  min-width: 0;
}

.header {
  height: 60px;
  padding: 0 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-soft);
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
  gap: 12px;
  min-width: 0;
}

.collapse-btn {
  color: var(--text-secondary);
  padding: 4px;
}

.header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-subtitle {
  margin: 1px 0 0;
  font-size: 12px;
  color: var(--text-muted);
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
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

/* 去掉 el-dropdown 触发元素默认的蓝色焦点轮廓，改用灰色 hover 背景 */
.user-trigger:focus,
.user-trigger:focus-visible {
  outline: none;
  box-shadow: none;
}

.user-trigger:hover {
  background: var(--bg-tertiary);
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.content {
  background: var(--bg-primary);
  padding: 20px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .header {
    padding: 0 12px;
  }

  .content {
    padding: 12px;
  }

  .user-name,
  .header-subtitle {
    display: none;
  }
}
</style>
