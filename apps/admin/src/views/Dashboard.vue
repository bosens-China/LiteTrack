<template>
  <div class="space-y-6">
    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <n-card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500">网站总数</p>
            <p class="text-3xl font-bold">{{ sitesStore.sites.length }}</p>
          </div>
          <Icon icon="mdi:web" class="text-4xl text-blue-500" />
        </div>
      </n-card>
      
      <n-card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500">今日访问</p>
            <p class="text-3xl font-bold">{{ todayViews }}</p>
          </div>
          <Icon icon="mdi:eye" class="text-4xl text-green-500" />
        </div>
      </n-card>
      
      <n-card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500">总访问量</p>
            <p class="text-3xl font-bold">{{ totalViews }}</p>
          </div>
          <Icon icon="mdi:trending-up" class="text-4xl text-purple-500" />
        </div>
      </n-card>
    </div>
    
    <!-- 最近网站 -->
    <n-card title="最近添加的网站">
      <n-empty v-if="sitesStore.sites.length === 0" description="暂无网站，快去创建吧">
        <template #extra>
          <n-button type="primary" @click="router.push('/sites/new')">
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
              {{ site.title }}
            </template>
            <template #description>
              {{ site.domain }}
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
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { getSiteStats } from '@/api/stats'

const router = useRouter()
const sitesStore = useSitesStore()

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

onMounted(async () => {
  await sitesStore.fetchSites()
  await fetchAllStats()
})
</script>
