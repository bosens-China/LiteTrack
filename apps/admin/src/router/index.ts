import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 页面标题映射
const titleMap: Record<string, string> = {
  Login: '登录',
  AuthCallback: '登录中',
  Dashboard: '仪表盘',
  Sites: '网站管理',
  SiteDetail: '网站详情',
  NotFound: '页面不存在',
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true, title: '登录' },
    },
    {
      path: '/auth/callback',
      name: 'AuthCallback',
      component: () => import('@/views/AuthCallback.vue'),
      meta: { public: true, title: '登录中' },
    },
    {
      path: '/',
      component: () => import('@/components/Layout.vue'),
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '仪表盘' },
        },
        {
          path: 'sites',
          name: 'Sites',
          component: () => import('@/views/Sites.vue'),
          meta: { title: '网站管理' },
        },
        {
          path: 'sites/:id',
          name: 'SiteDetail',
          component: () => import('@/views/SiteDetail/index.vue'),
          meta: { title: '网站详情' },
        },

      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: { public: true, title: '页面不存在' },
    },
  ],
})

// 路由拦截器 - 认证和标题设置
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // 设置页面标题
  const title = typeof to.name === 'string' ? titleMap[to.name] : ''
  document.title = title ? `${title} | LiteTrack` : 'LiteTrack'

  // 公开页面直接通过
  if (to.meta.public) {
    return true
  }

  // 已登录直接通过
  if (authStore.isLoggedIn) {
    return true
  }

  // 有 token 但未获取用户信息，尝试获取
  if (authStore.token) {
    try {
      await authStore.fetchUser()
      if (authStore.isLoggedIn) {
        return true
      }
    } catch {
      // 获取用户信息失败，继续执行跳转到登录页
    }
  }

  // 未登录，跳转登录页
  return '/login'
})

export default router
