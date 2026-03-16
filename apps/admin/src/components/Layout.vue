<template>
  <n-layout has-sider position="absolute" class="bg-[var(--bg-primary)]">
    <!-- 侧边栏 -->
    <n-layout-sider
      collapse-mode="width"
      :collapsed-width="72"
      :width="260"
      :collapsed="collapsed"
      show-trigger
      class="sidebar"
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="sidebar-header">
        <template v-if="!collapsed">
          <div class="logo-full">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Icon icon="mdi:chart-bar" class="text-xl text-white" />
            </div>
            <span class="logo-text gradient-text">LiteTrack</span>
          </div>
        </template>
        <template v-else>
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Icon icon="mdi:chart-bar" class="text-xl text-white" />
          </div>
        </template>
      </div>

      <n-menu
        :collapsed="collapsed"
        :collapsed-width="72"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeKey"
        class="sidebar-menu"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <!-- 主内容区 -->
    <n-layout class="bg-transparent">
      <!-- 顶部栏 -->
      <n-layout-header
        class="header"
      >
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <Icon icon="mdi:page-layout-header" class="text-slate-400" />
          </div>
          <h2 class="text-lg font-semibold text-white">{{ pageTitle }}</h2>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            class="btn-glass flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            @click="openSdkDistPage"
          >
            <Icon icon="mdi:download-box" />
            获取 SDK
          </button>

          <n-dropdown :options="userOptions" @select="handleUserAction">
            <div class="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 px-3 py-2 rounded-lg transition-colors">
              <n-avatar
                round
                size="small"
                :src="authStore.avatar || undefined"
                :fallback-src="`https://ui-avatars.com/api/?name=${authStore.username}&background=3B82F6&color=fff`"
              />
              <span v-if="authStore.username" class="text-slate-200 text-sm">{{ authStore.username }}</span>
              <Icon icon="mdi:chevron-down" class="text-slate-400" />
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <!-- 内容 -->
      <n-layout-content
        class="content"
        :native-scrollbar="false"
      >
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NAvatar,
  NDropdown,
  type MenuOption,
} from 'naive-ui';
import { Icon } from '@iconify/vue';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const collapsed = ref(false);
const SDK_DIST_URL =
  'https://github.com/bosens-China/LiteTrack/tree/master/apps/sdk/dist';

// 菜单配置
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
];

// 当前激活的菜单
const activeKey = computed(() => route.name as string);

// 页面标题
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    Dashboard: '仪表盘',
    Sites: '网站管理',
    SiteDetail: '网站详情',
  };
  return titles[route.name as string] || 'LiteTrack';
});

// 用户下拉选项
const userOptions = [
  {
    label: '退出登录',
    key: 'logout',
    icon: () => h(Icon, { icon: 'mdi:logout' }),
  },
];

// 菜单选择
function handleMenuSelect(key: string) {
  router.push({ name: key });
}

// 用户操作
function handleUserAction(key: string) {
  if (key === 'logout') {
    authStore.logout();
    router.push('/login');
  }
}

function openSdkDistPage() {
  window.open(SDK_DIST_URL, '_blank', 'noopener,noreferrer');
}
</script>

<style scoped>
.sidebar {
  background: var(--bg-secondary) !important;
  border-right: 1px solid var(--border-glass);
}

.sidebar-header {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border-bottom: 1px solid var(--border-glass);
}

.logo-full {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-glass);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
}

.content {
  padding: 24px;
  position: absolute;
  top: 72px;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-primary);
}

/* 菜单样式覆盖 */
:deep(.sidebar-menu) {
  --n-item-height: 48px;
  padding: 12px;
}

:deep(.sidebar-menu .n-menu-item) {
  margin-bottom: 4px;
}

:deep(.sidebar-menu .n-menu-item-content) {
  border-radius: 10px;
  color: var(--text-secondary) !important;
}

:deep(.sidebar-menu .n-menu-item-content:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text-primary) !important;
}

:deep(.sidebar-menu .n-menu-item-content--selected) {
  background: rgba(59, 130, 246, 0.15) !important;
  color: var(--accent-blue) !important;
}

:deep(.sidebar-menu .n-menu-item-content--selected::before) {
  display: none;
}

:deep(.sidebar-menu .n-menu-item-content__icon) {
  color: inherit !important;
}
</style>
