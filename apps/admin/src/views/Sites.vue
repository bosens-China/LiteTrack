<template>
  <div class="flex flex-col gap-4">
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
          网站列表
        </h2>
        <p
          style="
            margin: 4px 0 0;
            font-size: 13px;
            color: var(--el-text-color-secondary);
          "
        >
          管理站点基础信息，进入详情页查看统计趋势
        </p>
      </div>
      <el-button type="primary" @click="showCreateModal = true">
        <Icon icon="mdi:plus" class="mr-1" />创建网站
      </el-button>
    </div>

    <el-card shadow="never" :body-style="{ padding: '8px' }">
      <SiteTable
        :sites="pagedSites"
        :loading="sitesStore.loading"
        :action-width="210"
        action-align="left"
      >
        <template #actions="{ row }">
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
      </SiteTable>

      <div v-if="sitesStore.sites.length > 0" style="padding: 12px 8px 4px">
        <el-pagination
          class="w-full"
          layout="total, ->, sizes, prev, pager, next, jumper"
          :total="sitesStore.sites.length"
          :page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :current-page="currentPage"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
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
import CreateSiteModal from '@/components/CreateSiteModal.vue';
import SiteTable from '@/components/SiteTable.vue';
import type { Site } from '@/api/sites';

const router = useRouter();
const sitesStore = useSitesStore();

const showCreateModal = ref(false);

const pageSize = ref(10);
const currentPage = ref(1);

const pagedSites = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sitesStore.sites.slice(start, start + pageSize.value);
});

function handlePageChange(page: number) {
  currentPage.value = page;
}

function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

async function handleDelete(site: Site) {
  try {
    await sitesStore.removeSite(site.id);
    ElMessage.success('删除成功');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败';
    ElMessage.error(errorMessage);
  }
}

onMounted(() => {
  void sitesStore.fetchSites();
});
</script>
