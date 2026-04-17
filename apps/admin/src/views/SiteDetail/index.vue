<template>
  <div class="min-h-full page-shell">
    <div v-if="loading" class="site-detail-grid">
      <div class="full-width">
        <div class="glass-card p-6">
          <n-skeleton text style="width: 30%; height: 32px" />
          <n-skeleton text style="width: 50%; margin-top: 12px" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 full-width">
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
      <div class="glass-card p-5 full-width" style="height: 400px">
        <n-skeleton height="100%" />
      </div>
      <div class="glass-card p-5 full-width" style="height: 520px">
        <n-skeleton height="100%" />
      </div>
      <div class="content-row bottom-row">
        <div class="glass-card p-5 logs-section" style="height: 400px">
          <n-skeleton height="100%" />
        </div>
        <div class="glass-card p-5 tokens-section" style="height: 400px">
          <n-skeleton height="100%" />
        </div>
      </div>
    </div>

    <!-- 正常内容 -->
    <div v-else-if="site" class="site-detail-grid">
      <SiteHeader 
        :site="site" 
        @edit="openEditModal"
        class="full-width"
      />
      
      <StatCards 
        :stats="stats" 
        :today-views="todayViews"
        :loading="statsLoading"
        class="full-width"
      />
      
      <div class="content-row">
        <TrendChart :site-id="siteId" class="trend-section" />
        <PopularPages :site-id="siteId" class="pages-section" />
      </div>

      <AudienceInsights :site-id="siteId" class="full-width" />

      <div class="content-row bottom-row">
        <AccessLogs :site-id="siteId" class="logs-section" />
        <TokenList 
          :tokens="site.tokens"
          @create="showTokenModal = true"
          @delete="deleteToken"
          @edit="openEditTokenModal"
          class="tokens-section"
        />
      </div>

      <SiteEditModal
        v-model:show="showEditModal"
        v-model:title="editSiteTitle"
        v-model:description="editSiteDescription"
        :updating="updating"
        @save="handleUpdate"
      />

      <!-- 创建令牌弹窗 -->
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
    </div>

    <div v-else class="flex items-center justify-center min-h-[60vh]">
      <n-empty description="网站不存在或已被删除">
        <template #icon>
          <Icon icon="mdi:web-off" class="text-6xl text-slate-400" />
        </template>
        <template #extra>
          <button class="btn-primary mt-4 px-6 py-2 rounded-lg" @click="router.push('/sites')">
            返回网站列表
          </button>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NEmpty, NSkeleton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSiteDetailPage } from '@/composables/site-detail/useSiteDetailPage'

// 子组件导入
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
</script>

<style scoped>
.site-detail-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.full-width {
  width: 100%;
}

/* 内容行：默认垂直堆叠 */
.content-row {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.trend-section,
.pages-section {
  flex: 1;
  min-width: 0;
}

/* 大屏 (>1440px): 趋势图和热门页面并排 */
@media (min-width: 1440px) {
  .site-detail-grid {
    gap: 1.5rem;
  }
  
  .content-row {
    flex-direction: row;
    align-items: stretch;
  }
  
  .trend-section {
    flex: 1.5;
  }
  
  .pages-section {
    flex: 1;
    max-width: 420px;
  }
}

/* 底部行：日志和令牌默认堆叠 */
.bottom-row {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.logs-section,
.tokens-section {
  flex: 1;
  min-width: 0;
}

/* 大屏 (>1440px): 日志和令牌并排 */
@media (min-width: 1440px) {
  .bottom-row {
    flex-direction: row;
    align-items: stretch;
  }
  
  /* 与上方「访问趋势 : 热门页面」列宽比例一致（1.5 : 1） */
  .logs-section {
    flex: 1.5;
    min-width: 0;
  }

  .tokens-section {
    flex: 1;
    max-width: 420px;
  }
}

/* 超大屏 (>1920px): 更宽松的间距 */
@media (min-width: 1920px) {
  .site-detail-grid {
    gap: 1.75rem;
  }
  
  .content-row {
    gap: 1.75rem;
  }
  
  .pages-section {
    max-width: 480px;
  }
  
  .tokens-section {
    max-width: 480px;
  }
}

</style>
