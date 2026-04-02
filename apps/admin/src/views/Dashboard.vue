<template>
  <div class="page-shell dashboard-container">
    <template v-if="loading">
      <div class="dashboard-grid">
        <div class="main-content space-y-5">
          <div class="glass-card p-6">
            <n-skeleton text style="width: 150px; height: 32px" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="glass-card p-5">
              <n-skeleton height="80px" />
            </div>
            <div class="glass-card p-5">
              <n-skeleton height="80px" />
            </div>
            <div class="glass-card p-5">
              <n-skeleton height="80px" />
            </div>
          </div>
          <div class="glass-card p-5" style="height: 300px">
            <n-skeleton height="100%" />
          </div>
        </div>
        <div class="side-content hidden xl:block">
          <div class="glass-card p-5 h-full">
            <n-skeleton height="100%" />
          </div>
        </div>
      </div>
    </template>

    <!-- 正常内容 -->
    <template v-else>
      <div class="page-header">
        <div class="page-header__title">
          <div class="page-header__icon">
            <Icon icon="mdi:view-dashboard-outline" class="text-xl" />
          </div>
          <div>
            <h1 class="page-title">仪表盘</h1>
            <p class="page-subtitle">汇总站点数量、访问量和最近创建的网站。</p>
          </div>
        </div>

        <button class="btn-primary" @click="showCreateModal = true">
          <Icon icon="mdi:plus" />
          新建网站
        </button>
      </div>

      <div class="dashboard-grid">
        <div class="main-content space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="glass-card glass-card-blue p-5">
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                      <Icon icon="mdi:web" class="text-lg text-blue-400" />
                    </div>
                    <span class="stat-label">网站总数</span>
                  </div>
                  <p class="stat-value text-3xl text-[var(--text-primary)]">{{ sitesStore.sites.length }}</p>
                </div>
              </div>
            </div>
            
            <div class="glass-card glass-card-emerald p-5">
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <Icon icon="mdi:eye" class="text-lg text-emerald-400" />
                    </div>
                    <span class="stat-label">今日访问</span>
                  </div>
                  <p class="stat-value text-3xl text-[var(--text-primary)]">{{ formatNumber(todayViews) }}</p>
                </div>
              </div>
            </div>
            
            <div class="glass-card glass-card-violet p-5">
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                      <Icon icon="mdi:trending-up" class="text-lg text-violet-400" />
                    </div>
                    <span class="stat-label">总访问量</span>
                  </div>
                  <p class="stat-value text-3xl text-[var(--text-primary)]">{{ formatNumber(totalViews) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="glass-card p-5">
            <div class="flex items-center justify-between gap-4 mb-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                  <Icon icon="mdi:clock-outline" class="text-lg" />
                </div>
                <div>
                  <h3 class="panel-title">最近添加的网站</h3>
                  <p class="panel-subtitle">优先展示最近创建的 5 个站点。</p>
                </div>
              </div>
            </div>
            
            <n-empty v-if="sitesStore.sites.length === 0" description="暂无网站，快去创建吧">
              <template #icon>
                <Icon icon="mdi:web-plus" class="text-5xl text-slate-400" />
              </template>
              <template #extra>
                <button class="btn-primary mt-4 px-4 py-2 rounded-lg" @click="showCreateModal = true">
                  创建网站
                </button>
              </template>
            </n-empty>
            
            <div v-else class="space-y-2">
              <div
                v-for="site in recentSites"
                :key="site.id"
                class="group flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors cursor-pointer border border-slate-200 hover:border-blue-200"
                @click="router.push(`/sites/${site.id}`)"
              >
                <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 text-blue-700">
                  <Icon icon="mdi:web" class="text-xl" />
                </div>
                
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-[var(--text-primary)]">
                    {{ site.title || site.domain }}
                  </p>
                  <p class="text-xs text-[var(--text-secondary)]">{{ site.domain }}</p>
                </div>
                
                <div class="flex items-center gap-4">
                  <span class="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                    {{ site._count?.tokens || 0 }} 个令牌
                  </span>
                  <Icon icon="mdi:chevron-right" class="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="side-content">
          <div class="glass-card p-5 h-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Icon icon="mdi:lightning-bolt" class="text-lg" />
              </div>
              <div>
                <h3 class="panel-title">快捷入口</h3>
                <p class="panel-subtitle">常用操作集中在这里。</p>
              </div>
            </div>
            
            <div class="space-y-3">
              <button 
                class="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
                @click="showCreateModal = true"
              >
                <Icon icon="mdi:plus" />
                新建网站
              </button>
              
              <button 
                class="btn-glass w-full py-2.5 rounded-lg"
                @click="router.push('/sites')"
              >
                <Icon icon="mdi:web" />
                管理网站
              </button>
              
              <div class="h-px bg-slate-200 my-4" />
              
              <div class="text-sm text-[var(--text-secondary)] space-y-3">
                <p class="font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <Icon icon="mdi:help-circle" class="text-slate-400" />
                  使用提示
                </p>
                <ul class="space-y-2">
                  <li class="flex items-start gap-2">
                    <Icon icon="mdi:check-circle" class="text-emerald-500 text-xs mt-1 shrink-0" />
                    <span>点击网站查看详细统计</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <Icon icon="mdi:check-circle" class="text-emerald-500 text-xs mt-1 shrink-0" />
                    <span>在网站详情页可以管理令牌</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <Icon icon="mdi:check-circle" class="text-emerald-500 text-xs mt-1 shrink-0" />
                    <span>使用 SDK 收集访问数据</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 创建网站弹窗 -->
    <CreateSiteModal v-model:show="showCreateModal" @success="handleCreateSuccess" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  NEmpty,
  NSkeleton,
  useMessage,
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { getSiteStats } from '@/api/stats'
import CreateSiteModal from '@/components/CreateSiteModal.vue'

const router = useRouter()
const sitesStore = useSitesStore()
const message = useMessage()

// 弹窗状态
const showCreateModal = ref(false)

// 加载状态
const loading = ref(false)

// 统计数据
const sitesStats = ref<Map<number, { today: number; total: number }>>(new Map())

const recentSites = computed(() => {
  return [...sitesStore.sites]
    .sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
    .slice(0, 5)
})

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

const todayViews = computed(() => {
  let total = 0
  sitesStats.value.forEach((stats) => {
    total += stats.today
  })
  return total
})

const totalViews = computed(() => {
  let total = 0
  sitesStats.value.forEach((stats) => {
    total += stats.total
  })
  return total
})

async function fetchAllStats() {
  sitesStats.value.clear()
  if (sitesStore.sites.length === 0) return
  
  const today = new Date().toLocaleDateString('sv-SE')
  
  await Promise.all(
    sitesStore.sites.map(async (site) => {
      try {
        const stats = await getSiteStats(site.id)
        const todayData = stats.dailyViews.find(d => d.date === today)
        sitesStats.value.set(site.id, {
          today: todayData?.count || 0,
          total: stats.summary.totalViews,
        })
      } catch {
        sitesStats.value.set(site.id, { today: 0, total: 0 })
      }
    })
  )
}

async function handleCreateSuccess(siteId: number) {
  await sitesStore.fetchSites()
  await fetchAllStats()
  await router.push(`/sites/${siteId}`)
}

async function init() {
  loading.value = true
  try {
    await sitesStore.fetchSites()
    await fetchAllStats()
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '加载数据失败'
    message.error(errorMessage)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void init()
})
</script>

<style scoped>
.dashboard-container {
  width: 100%;
}

.dashboard-grid {
  display: grid;
  gap: 1.5rem;
}

@media (min-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: 1fr 320px;
  }
}

@media (min-width: 1920px) {
  .dashboard-grid {
    grid-template-columns: 1fr 360px;
    gap: 2rem;
  }
}

.main-content {
  min-width: 0;
}

.side-content {
  min-width: 0;
}

@media (max-width: 1279px) {
  .side-content {
    order: -1;
  }
}
</style>
