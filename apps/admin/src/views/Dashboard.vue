<template>
  <div class="flex flex-col gap-4">
    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--el-text-color-primary)">
          全站概览
        </h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: var(--el-text-color-secondary)">
          汇总所有站点的访问数据
        </p>
      </div>
      <el-button type="primary" @click="showCreateModal = true">
        <Icon icon="mdi:plus" class="mr-1" />新建网站
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-skeleton v-if="loading" animated :rows="3" />
    <el-row v-else :gutter="16">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="flex items-center gap-2 mb-3">
            <div class="summary-icon icon-primary">
              <Icon icon="mdi:web" class="text-lg" />
            </div>
            <span class="summary-label">网站总数</span>
          </div>
          <div class="summary-value">{{ dashboardSummary.siteCount }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="flex items-center gap-2 mb-3">
            <div class="summary-icon icon-success">
              <Icon icon="mdi:eye" class="text-lg" />
            </div>
            <span class="summary-label">今日访问</span>
          </div>
          <div class="summary-value">{{ formatNumber(dashboardSummary.todayViews) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="summary-card">
          <div class="flex items-center gap-2 mb-3">
            <div class="summary-icon icon-info">
              <Icon icon="mdi:trending-up" class="text-lg" />
            </div>
            <span class="summary-label">总访问量</span>
          </div>
          <div class="summary-value">{{ formatNumber(dashboardSummary.totalViews) }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 站点列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">网站列表</span>
          <el-button size="small" @click="router.push('/sites')">
            管理网站 <Icon icon="mdi:arrow-right" class="ml-1" />
          </el-button>
        </div>
      </template>

      <el-empty v-if="!loading && sitesStore.sites.length === 0" description="暂无网站，快去创建吧">
        <el-button type="primary" @click="showCreateModal = true">创建网站</el-button>
      </el-empty>

      <el-table
        v-else
        v-loading="loading"
        :data="sitesStore.sites"
        style="width: 100%"
        row-class-name="cursor-pointer"
        @row-click="(row: Site) => router.push(`/sites/${row.id}`)"
      >
        <el-table-column label="网站" min-width="220">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <div class="site-icon">
                <Icon icon="mdi:web" class="text-lg" />
              </div>
              <div class="min-w-0">
                <div class="font-medium text-sm truncate" style="color: var(--el-text-color-primary)">
                  {{ row.title || row.domain }}
                </div>
                <div class="text-xs truncate font-mono" style="color: var(--el-text-color-secondary)">
                  {{ row.domain }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.description" class="text-sm" style="color: var(--el-text-color-secondary)">
              {{ row.description }}
            </span>
            <span v-else class="text-sm" style="color: var(--el-text-color-placeholder); font-style: italic">
              暂无描述
            </span>
          </template>
        </el-table-column>

        <el-table-column label="令牌数" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small" effect="light">
              {{ row._count?.tokens ?? 0 }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="140">
          <template #default="{ row }">
            <span class="text-sm font-mono" style="color: var(--el-text-color-secondary)">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              link
              @click.stop="router.push(`/sites/${row.id}`)"
            >
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <CreateSiteModal v-model:show="showCreateModal" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { getDashboardSummary, type DashboardSummaryResponse } from '@/api/stats'
import CreateSiteModal from '@/components/CreateSiteModal.vue'
import type { Site } from '@/api/sites'

const router = useRouter()
const sitesStore = useSitesStore()

const showCreateModal = ref(false)
const loading = ref(false)

const dashboardSummary = ref<DashboardSummaryResponse['summary']>({
  siteCount: 0,
  todayViews: 0,
  totalViews: 0,
})

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function init() {
  loading.value = true
  try {
    const [, dashboard] = await Promise.all([
      sitesStore.fetchSites(),
      getDashboardSummary(),
    ])
    dashboardSummary.value = dashboard.summary
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '加载数据失败'
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void init()
})
</script>

<style scoped>
.summary-card {
  margin-bottom: 16px;
}

.summary-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-primary {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.icon-success {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.icon-info {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.summary-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-family: 'Fira Code', monospace;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.site-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

@media (min-width: 576px) {
  .summary-card {
    margin-bottom: 0;
  }
}
</style>
