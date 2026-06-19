<template>
  <el-card
    shadow="never"
    class="h-full"
    :body-style="{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="panel-icon">
            <Icon icon="mdi:fire" class="text-lg" />
          </div>
          <div>
            <div class="font-medium text-sm">热门页面</div>
            <div class="text-xs" style="color: var(--el-text-color-secondary)">
              优先显示页面标题，其次展示路径
            </div>
          </div>
        </div>
        <el-button text size="small" @click="showDialog = true">
          查看全部
          <Icon icon="mdi:chevron-right" class="text-sm ml-0.5" />
        </el-button>
      </div>
    </template>

    <el-empty v-if="pages.length === 0" description="暂无数据" />

    <div v-else class="flex-1 overflow-hidden">
      <div style="overflow: auto; max-height: 320px">
        <div class="space-y-2">
          <div
            v-for="(page, index) in pages"
            :key="page.path"
            class="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-200"
          >
            <div
              class="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold font-mono"
              :class="[
                index === 0
                  ? 'bg-amber-100 text-amber-700'
                  : index === 1
                    ? 'bg-slate-200 text-slate-700'
                    : index === 2
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-slate-100 text-slate-500',
              ]"
            >
              {{ index + 1 }}
            </div>

            <div class="flex-1 min-w-0">
              <el-tooltip :content="page.path" placement="top">
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate" style="color: var(--text-primary)">
                    {{ primaryPageLabel(page) }}
                  </p>
                  <p
                    v-if="showPagePathSubline(page)"
                    class="text-xs truncate font-mono"
                    style="color: var(--text-secondary)"
                  >
                    {{ page.path }}
                  </p>
                </div>
              </el-tooltip>
            </div>

            <div class="shrink-0 flex items-center gap-1.5">
              <span class="text-xs" style="color: var(--text-secondary)">
                {{ page.count.toLocaleString('zh-CN') }}
              </span>
              <Icon icon="mdi:eye" class="text-xs text-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <AllPagesDialog v-model:show="showDialog" :site-id="siteId" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { getPopularPages } from '@/api/stats'
import type { PageView } from '@/api/stats'
import { useRequest } from 'vue-request'
import AllPagesDialog from './AllPagesDialog.vue'

const props = defineProps<{ siteId: number }>()

const pages = ref<PageView[]>([])
const showDialog = ref(false)

function primaryPageLabel(row: PageView): string {
  const t = row.title?.trim()
  return t ? t : row.path
}

function showPagePathSubline(row: PageView): boolean {
  const t = row.title?.trim()
  return Boolean(t && t !== row.path)
}

const { run: fetchTopPages } = useRequest(
  async () => {
    const { popularPages } = await getPopularPages(props.siteId)
    pages.value = popularPages.slice(0, 10)
  },
  {
    manual: true,
    onError: (error) => {
      ElMessage.error(error instanceof Error ? error.message : '加载热门页面失败')
    },
  },
)

watch(() => props.siteId, () => { fetchTopPages() }, { immediate: true })
</script>

<style scoped>
.panel-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}
</style>
