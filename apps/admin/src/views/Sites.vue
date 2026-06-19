<template>
  <div class="page-shell">
    <div class="page-header">
      <div class="page-header__title">
        <div class="page-header__icon">
          <Icon icon="mdi:web" class="text-xl" />
        </div>
        <div>
          <h1 class="page-title">网站管理</h1>
          <p class="page-subtitle">管理站点基础信息，并进入详情页查看统计趋势。</p>
        </div>
      </div>
      <el-button type="primary" @click="showCreateModal = true">
        <Icon icon="mdi:plus" class="mr-1" />
        创建网站
      </el-button>
    </div>

    <div class="glass-card p-2 overflow-hidden">
      <el-table
        v-loading="sitesStore.loading"
        :data="pagedSites"
        row-key="id"
        class="sites-table"
      >
        <el-table-column label="网站" min-width="220">
          <template #default="{ row }">
            <div class="flex items-center gap-3">
              <div class="site-icon">
                <Icon icon="mdi:web" class="text-lg" />
              </div>
              <div class="min-w-0">
                <div class="font-medium text-[var(--text-primary)] truncate">
                  {{ row.title || row.domain }}
                </div>
                <div class="text-[var(--text-secondary)] text-xs truncate">
                  {{ row.domain }}
                </div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.description" class="text-[var(--text-secondary)] text-sm">
              {{ row.description }}
            </span>
            <span v-else class="text-[var(--text-muted)] text-sm italic">暂无描述</span>
          </template>
        </el-table-column>

        <el-table-column label="令牌数" width="100" align="center">
          <template #default="{ row }">
            <span class="token-badge">{{ row._count?.tokens || 0 }}</span>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="140">
          <template #default="{ row }">
            <span class="text-[var(--text-secondary)] text-sm font-mono">
              {{ formatDate(row.createdAt) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="210">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-button
                size="small"
                type="primary"
                plain
                @click="router.push(`/sites/${row.id}`)"
              >
                <Icon icon="mdi:chart-line" class="mr-1" />
                查看统计
              </el-button>
              <el-popconfirm
                :title="`确定要删除网站 “${row.title || row.domain}” 吗？此操作不可恢复。`"
                confirm-button-text="删除"
                cancel-button-text="取消"
                confirm-button-type="danger"
                :width="260"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger" plain>
                    <Icon icon="mdi:delete" class="mr-1" />
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="sitesStore.sites.length > pageSize" class="table-pagination">
        <el-pagination
          layout="prev, pager, next, total"
          :total="sitesStore.sites.length"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 创建网站弹窗 -->
    <CreateSiteModal v-model:show="showCreateModal" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import CreateSiteModal from '@/components/CreateSiteModal.vue'
import type { Site } from '@/api/sites'

const router = useRouter()
const sitesStore = useSitesStore()

// 弹窗状态
const showCreateModal = ref(false)

// 客户端分页
const pageSize = 10
const currentPage = ref(1)

const pagedSites = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sitesStore.sites.slice(start, start + pageSize)
})

function handlePageChange(page: number) {
  currentPage.value = page
}

// 格式化日期
function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// 删除处理
async function handleDelete(site: Site) {
  try {
    await sitesStore.removeSite(site.id)
    ElMessage.success('删除成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败'
    ElMessage.error(errorMessage)
  }
}

onMounted(() => {
  void sitesStore.fetchSites()
})
</script>

<style scoped>
.sites-table {
  --el-table-border-color: var(--border-soft);
}

.site-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--bg-brand-soft);
  color: var(--accent-blue);
}

.token-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--bg-success-soft);
  color: var(--accent-emerald);
  font-size: 12px;
  font-weight: 500;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 8px 4px;
}
</style>
