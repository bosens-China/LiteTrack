<template>
  <div v-if="loading" style="padding: 24px">
    <el-skeleton animated :rows="8" />
  </div>

  <template v-else-if="site">
    <SiteHeader :site="site" @edit="openEditModal" />

    <el-tabs v-model="activeTab" style="margin-top: 16px">
      <el-tab-pane label="概览" name="overview">
        <div class="flex flex-col gap-4">
          <StatCards :stats="stats" :today-views="todayViews" :loading="statsLoading" />
          <div class="overview-row">
            <TrendChart :site-id="siteId" class="trend-col" />
            <PopularPages :site-id="siteId" class="pages-col" />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="受众分析" name="audience">
        <AudienceInsights :site-id="siteId" />
      </el-tab-pane>

      <el-tab-pane label="访问日志" name="logs">
        <AccessLogs :site-id="siteId" />
      </el-tab-pane>

      <el-tab-pane label="设置" name="settings">
        <div class="flex flex-col gap-4">
          <el-card shadow="never">
            <template #header>
              <div class="flex items-center justify-between">
                <span class="font-medium">基本信息</span>
                <el-button size="small" @click="openEditModal">
                  <Icon icon="mdi:pencil" class="mr-1" />编辑
                </el-button>
              </div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="站点名称">
                {{ site.title || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="域名">
                <span class="font-mono text-sm">{{ site.domain }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">
                {{ site.description || '暂无描述' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ formatDate(site.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="最后更新">{{ formatDate(site.updatedAt) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <TokenList
            :tokens="site.tokens"
            @create="showTokenModal = true"
            @delete="deleteToken"
            @edit="openEditTokenModal"
          />
        </div>
      </el-tab-pane>
    </el-tabs>

    <SiteEditModal
      v-model:show="showEditModal"
      v-model:title="editSiteTitle"
      v-model:description="editSiteDescription"
      :updating="updating"
      @save="handleUpdate"
    />

    <TokenModal
      v-model:show="showTokenModal"
      :created-token="createdToken"
      :creating="creatingToken"
      @create="handleCreateToken"
      @close="resetTokenModal"
    />

    <TokenEditModal
      v-model:show="showEditTokenModal"
      v-model:name="editTokenName"
      v-model:description="editTokenDescription"
      :updating="updatingToken"
      @save="handleUpdateToken"
    />
  </template>

  <div v-else style="min-height: 60vh; display: flex; align-items: center; justify-content: center">
    <el-empty description="网站不存在或已被删除">
      <el-button type="primary" @click="router.push('/sites')">返回网站列表</el-button>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { useSiteDetailPage } from '@/composables/site-detail/useSiteDetailPage'

import SiteHeader from './SiteHeader.vue'
import StatCards from './StatCards.vue'
import TrendChart from './TrendChart.vue'
import PopularPages from './PopularPages.vue'
import AccessLogs from './AccessLogs.vue'
import AudienceInsights from './AudienceInsights.vue'
import TokenList from './TokenList.vue'
import TokenModal from './TokenModal.vue'
import SiteEditModal from './modals/SiteEditModal.vue'
import TokenEditModal from './modals/TokenEditModal.vue'

const route = useRoute()
const router = useRouter()

const siteId = computed(() => parseInt(route.params.id as string, 10))
const activeTab = ref('overview')

const {
  createdToken,
  creatingToken,
  deleteToken,
  editSiteDescription,
  editSiteTitle,
  editTokenDescription,
  editTokenName,
  handleCreateToken,
  handleUpdate,
  handleUpdateToken,
  loading,
  openEditModal,
  openEditTokenModal,
  resetTokenModal,
  showEditModal,
  showEditTokenModal,
  showTokenModal,
  site,
  stats,
  statsLoading,
  todayViews,
  updating,
  updatingToken,
} = useSiteDetailPage(() => siteId.value)

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<style scoped>
.overview-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 1440px) {
  .overview-row {
    flex-direction: row;
    align-items: stretch;
  }

  .trend-col {
    flex: 1.5;
    min-width: 0;
  }

  .pages-col {
    flex: 1;
    max-width: 420px;
  }
}
</style>
