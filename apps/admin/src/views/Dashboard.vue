<template>
  <div class="flex flex-col gap-4">
    <!-- 操作栏 -->
    <div class="flex items-center justify-between">
      <div>
        <h2
          style="
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--el-text-color-primary);
          "
        >
          全站概览
        </h2>
        <p
          style="
            margin: 4px 0 0;
            font-size: 13px;
            color: var(--el-text-color-secondary);
          "
        >
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
          <div class="summary-value">
            {{ formatNumber(dashboardSummary.todayViews) }}
          </div>
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
          <div class="summary-value">
            {{ formatNumber(dashboardSummary.totalViews) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近网站（只读速览，完整管理在「网站管理」） -->
    <el-card shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="font-medium">最近网站</span>
          <el-button size="small" @click="router.push('/sites')">
            管理网站 <Icon icon="mdi:arrow-right" class="ml-1" />
          </el-button>
        </div>
      </template>

      <el-empty
        v-if="!loading && sitesStore.sites.length === 0"
        description="暂无网站，快去创建吧"
      >
        <el-button type="primary" @click="showCreateModal = true"
          >创建网站</el-button
        >
      </el-empty>

      <SiteTable
        v-else
        :sites="recentSites"
        :loading="loading"
        :action-width="100"
        row-clickable
        @row-click="(row) => router.push(`/sites/${row.id}`)"
      >
        <template #actions="{ row }">
          <el-button
            size="small"
            type="primary"
            link
            @click.stop="router.push(`/sites/${row.id}`)"
          >
            查看详情
          </el-button>
        </template>
      </SiteTable>
    </el-card>

    <CreateSiteModal v-model:show="showCreateModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Icon } from '@iconify/vue';
import { useSitesStore } from '@/stores/sites';
import {
  getDashboardSummary,
  type DashboardSummaryResponse,
} from '@/api/stats';
import CreateSiteModal from '@/components/CreateSiteModal.vue';
import SiteTable from '@/components/SiteTable.vue';

const router = useRouter();
const sitesStore = useSitesStore();

const showCreateModal = ref(false);
const loading = ref(false);

/** 概览页只展示最近的若干网站，完整列表在「网站管理」 */
const recentSites = computed(() => sitesStore.sites.slice(0, 5));

const dashboardSummary = ref<DashboardSummaryResponse['summary']>({
  siteCount: 0,
  todayViews: 0,
  totalViews: 0,
});

function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN');
}

async function init() {
  loading.value = true;
  try {
    const [, dashboard] = await Promise.all([
      sitesStore.fetchSites(),
      getDashboardSummary(),
    ]);
    dashboardSummary.value = dashboard.summary;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '加载数据失败';
    ElMessage.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void init();
});
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

@media (min-width: 576px) {
  .summary-card {
    margin-bottom: 0;
  }
}
</style>
