<template>
  <div class="dashboard-container">
    <!-- 加载骨架屏 -->
    <template v-if="loading">
      <div class="dashboard-grid">
        <div class="main-content space-y-5">
          <div class="flex justify-between items-center">
            <n-skeleton text style="width: 150px; height: 32px" />
            <n-skeleton style="width: 120px; height: 40px; border-radius: 8px" />
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
      <div class="dashboard-grid">
        <!-- 主内容区 -->
        <div class="main-content space-y-5">
          <!-- 标题栏 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Icon icon="mdi:view-dashboard" class="text-xl text-white" />
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">仪表盘</h2>
                <p class="text-sm text-slate-400">概览您的所有网站数据</p>
              </div>
            </div>
          </div>

          <!-- 统计卡片 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <!-- 网站总数 -->
            <div class="glass-card glass-card-blue p-5 relative overflow-hidden group">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all duration-500" />
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Icon icon="mdi:web" class="text-lg text-blue-400" />
                    </div>
                    <span class="stat-label">网站总数</span>
                  </div>
                  <p class="stat-value text-3xl text-white">{{ sitesStore.sites.length }}</p>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
            </div>
            
            <!-- 今日访问 -->
            <div class="glass-card glass-card-emerald p-5 relative overflow-hidden group">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all duration-500" />
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Icon icon="mdi:eye" class="text-lg text-emerald-400" />
                    </div>
                    <span class="stat-label">今日访问</span>
                  </div>
                  <p class="stat-value text-3xl text-white">{{ formatNumber(todayViews) }}</p>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            </div>
            
            <!-- 总访问量 -->
            <div class="glass-card glass-card-violet p-5 relative overflow-hidden group">
              <div class="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl group-hover:bg-violet-500/30 transition-all duration-500" />
              <div class="flex items-center justify-between relative z-10">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Icon icon="mdi:trending-up" class="text-lg text-violet-400" />
                    </div>
                    <span class="stat-label">总访问量</span>
                  </div>
                  <p class="stat-value text-3xl text-white">{{ formatNumber(totalViews) }}</p>
                </div>
              </div>
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            </div>
          </div>
          
          <!-- 最近网站 -->
          <div class="glass-card p-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Icon icon="mdi:clock-outline" class="text-lg text-slate-400" />
                </div>
                <h3 class="text-lg font-semibold text-white">最近添加的网站</h3>
              </div>
              <button 
                class="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5"
                @click="showCreateModal = true"
              >
                <Icon icon="mdi:plus" />
                新建
              </button>
            </div>
            
            <n-empty v-if="sitesStore.sites.length === 0" description="暂无网站，快去创建吧">
              <template #icon>
                <Icon icon="mdi:web-plus" class="text-5xl text-slate-600" />
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
                class="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-700/40 transition-all duration-200 cursor-pointer border border-transparent hover:border-slate-600/30"
                @click="router.push(`/sites/${site.id}`)"
              >
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
                  <Icon icon="mdi:web" class="text-xl text-blue-400" />
                </div>
                
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    {{ site.title || site.domain }}
                  </p>
                  <p v-if="site.title" class="text-xs text-slate-500">{{ site.domain }}</p>
                </div>
                
                <div class="flex items-center gap-4">
                  <span class="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    {{ site._count?.tokens || 0 }} 个令牌
                  </span>
                  <Icon icon="mdi:chevron-right" class="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 侧边栏（大屏显示） -->
        <div class="side-content hidden xl:block">
          <div class="glass-card p-5 h-full">
            <div class="flex items-center gap-3 mb-5">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Icon icon="mdi:lightning-bolt" class="text-lg text-amber-400" />
              </div>
              <h3 class="text-lg font-semibold text-white">快速操作</h3>
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
                class="btn-glass w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
                @click="router.push('/sites')"
              >
                <Icon icon="mdi:web" />
                管理网站
              </button>
              
              <div class="h-px bg-slate-700/50 my-4" />
              
              <div class="text-sm text-slate-400 space-y-3">
                <p class="font-medium text-slate-300 flex items-center gap-2">
                  <Icon icon="mdi:help-circle" class="text-slate-500" />
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

// 最近添加的 5 个网站
const recentSites = computed(() => {
  return sitesStore.sites.slice(0, 5)
})

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

// 今日访问（汇总所有网站）
const todayViews = computed(() => {
  let total = 0
  sitesStats.value.forEach((stats) => {
    total += stats.today
  })
  return total
})

// 总访问量（汇总所有网站）
const totalViews = computed(() => {
  let total = 0
  sitesStats.value.forEach((stats) => {
    total += stats.total
  })
  return total
})

// 获取所有网站的统计
async function fetchAllStats() {
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

// 创建成功处理
function handleCreateSuccess(siteId: number) {
  void sitesStore.fetchSites()
  void fetchAllStats()
  router.push(`/sites/${siteId}`)
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

/* 大屏 (>1440px): 左右两栏布局 */
@media (min-width: 1440px) {
  .dashboard-grid {
    grid-template-columns: 1fr 320px;
  }
}

/* 超大屏 (>1920px): 更宽的侧边栏 */
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
</style>
