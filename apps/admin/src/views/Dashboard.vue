<template>
  <div class="dashboard-container">
    <!-- 加载骨架屏 -->
    <template v-if="loading">
      <div class="dashboard-grid">
        <div class="main-content space-y-4">
          <div class="flex justify-between items-center">
            <n-skeleton text style="width: 150px; height: 32px" />
            <n-skeleton style="width: 120px; height: 34px" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <n-skeleton height="100px" />
            <n-skeleton height="100px" />
            <n-skeleton height="100px" />
          </div>
          <n-skeleton height="200px" />
        </div>
        <div class="side-content hidden xl:block">
          <n-skeleton height="300px" />
        </div>
      </div>
    </template>

    <!-- 正常内容 -->
    <template v-else>
      <div class="dashboard-grid">
        <!-- 主内容区 -->
        <div class="main-content space-y-4">
          <!-- 标题栏 -->
          <div class="flex items-center">
            <h2 class="text-2xl font-bold text-gray-800">仪表盘</h2>
          </div>

          <!-- 统计卡片 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <n-card class="stat-card-blue">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-blue-600/80 text-sm font-medium">网站总数</p>
                  <p class="text-2xl xl:text-3xl font-bold text-blue-700">{{ sitesStore.sites.length }}</p>
                </div>
                <Icon icon="mdi:web" class="text-3xl xl:text-4xl text-blue-500" />
              </div>
            </n-card>
            
            <n-card class="stat-card-green">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-green-600/80 text-sm font-medium">今日访问</p>
                  <p class="text-2xl xl:text-3xl font-bold text-green-700">{{ todayViews }}</p>
                </div>
                <Icon icon="mdi:eye" class="text-3xl xl:text-4xl text-green-500" />
              </div>
            </n-card>
            
            <n-card class="stat-card-purple">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-purple-600/80 text-sm font-medium">总访问量</p>
                  <p class="text-2xl xl:text-3xl font-bold text-purple-700">{{ totalViews }}</p>
                </div>
                <Icon icon="mdi:trending-up" class="text-3xl xl:text-4xl text-purple-500" />
              </div>
            </n-card>
          </div>
          
          <!-- 最近网站 -->
          <n-card title="最近添加的网站" class="site-list-card">
            <n-empty v-if="sitesStore.sites.length === 0" description="暂无网站，快去创建吧">
              <template #extra>
                <n-button type="primary" @click="showCreateModal = true">
                  创建网站
                </n-button>
              </template>
            </n-empty>
            
            <n-list v-else>
              <n-list-item
                v-for="site in recentSites"
                :key="site.id"
                @click="router.push(`/sites/${site.id}`)"
                class="cursor-pointer hover:bg-gray-50"
              >
                <n-thing>
                  <template #avatar>
                    <Icon icon="mdi:web" class="text-2xl text-blue-500" />
                  </template>
                  <template #header>
                    {{ site.title || site.domain }}
                  </template>
                  <template #description>
                    <span v-if="site.title" class="text-gray-500">{{ site.domain }}</span>
                  </template>
                  <template #header-extra>
                    <n-tag size="small" type="success">
                      {{ site._count?.tokens || 0 }} 个令牌
                    </n-tag>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </n-card>
        </div>

        <!-- 侧边栏（大屏显示） -->
        <div class="side-content hidden xl:block">
          <n-card title="快速操作" class="h-full">
            <div class="space-y-3">
              <n-button block type="primary" @click="showCreateModal = true">
                <template #icon>
                  <Icon icon="mdi:plus" />
                </template>
                新建网站
              </n-button>
              <n-button block @click="router.push('/sites')">
                <template #icon>
                  <Icon icon="mdi:web" />
                </template>
                管理网站
              </n-button>
              <n-divider />
              <div class="text-sm text-gray-500">
                <p class="mb-2">使用提示：</p>
                <ul class="list-disc list-inside space-y-1">
                  <li>点击网站查看详细统计</li>
                  <li>在网站详情页可以管理令牌</li>
                  <li>使用 SDK 收集访问数据</li>
                </ul>
              </div>
            </div>
          </n-card>
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
  NCard,
  NEmpty,
  NList,
  NListItem,
  NThing,
  NTag,
  NButton,
  NSkeleton,
  NDivider,
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
        // 忽略错误，显示为 0
        sitesStats.value.set(site.id, { today: 0, total: 0 })
      }
    })
  )
}

// 创建成功处理
function handleCreateSuccess(siteId: number) {
  // 刷新数据
  void sitesStore.fetchSites()
  void fetchAllStats()
  // 跳转到新创建的网站详情
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

/* 卡片内容紧凑 */
.site-list-card :deep(.n-list-item) {
  padding: 0.75rem 0;
}
</style>
