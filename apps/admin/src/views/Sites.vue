<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--el-text-color-primary)">
          网站列表
        </h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: var(--el-text-color-secondary)">
          管理站点基础信息，进入详情页查看统计趋势
        </p>
      </div>
      <el-button type="primary" @click="showCreateModal = true">
        <Icon icon="mdi:plus" class="mr-1" />创建网站
      </el-button>
    </div>

    <el-card shadow="never" :body-style="{ padding: '8px' }">
      <el-table
        v-loading="sitesStore.loading"
        :data="pagedSites"
        row-key="id"
        style="width: 100%"
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

        <el-table-column label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.description" class="text-sm" style="color: var(--el-text-color-secondary)">
              {{ row.description }}
            </span>
            <span v-else class="text-sm" style="color: var(--el-text-color-placeholder); font-style: italic">
              暂无描述
            </span>
          </template>
        </el-table-column>

        <el-table-column label="令牌数" width="100" align="center">
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

        <el-table-column label="操作" width="210">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <el-button
                size="small"
                type="primary"
                plain
                @click="router.push(`/sites/${row.id}`)"
              >
                <Icon icon="mdi:chart-line" class="mr-1" />查看统计
              </el-button>
              <el-popconfirm
                :title="`确定要删除网站「${row.title || row.domain}」吗？此操作不可恢复。`"
                confirm-button-text="删除"
                cancel-button-text="取消"
                confirm-button-type="danger"
                :width="260"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger" plain>
                    <Icon icon="mdi:delete" class="mr-1" />删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="sitesStore.sites.length > pageSize" class="flex justify-end" style="padding: 12px 8px 4px">
        <el-pagination
          layout="prev, pager, next, total"
          :total="sitesStore.sites.length"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

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

const showCreateModal = ref(false)

const pageSize = 10
const currentPage = ref(1)

const pagedSites = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return sitesStore.sites.slice(start, start + pageSize)
})

function handlePageChange(page: number) {
  currentPage.value = page
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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
</style>
