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

      <n-modal 
        v-model:show="showEditModal" 
        preset="dialog" 
        title="编辑网站信息"
        class="edit-modal"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">网站名称</label>
            <n-input 
              v-model:value="editForm.title" 
              placeholder="输入网站名称（可选）"
              size="large"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">描述</label>
            <n-input 
              v-model:value="editForm.description" 
              type="textarea" 
              :rows="3"
              placeholder="输入网站描述（可选）"
            />
          </div>
        </div>
        <template #action>
          <div class="flex justify-end gap-3">
            <button class="btn-glass px-4 py-2 rounded-lg" @click="showEditModal = false">
              取消
            </button>
            <button 
              class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
              :disabled="updating"
              @click="handleUpdate"
            >
              <Icon v-if="updating" icon="mdi:loading" class="animate-spin" />
              <span>保存</span>
            </button>
          </div>
        </template>
      </n-modal>

      <!-- 创建令牌弹窗 -->
      <TokenModal
        v-model:show="showTokenModal"
        :created-token="createdToken"
        :creating="creatingToken"
        @create="handleCreateToken"
        @close="resetTokenModal"
      />

      <n-modal
        v-model:show="showEditTokenModal"
        preset="dialog"
        title="编辑访问令牌"
        class="edit-modal"
      >
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">名称</label>
            <n-input
              v-model:value="editTokenForm.name"
              placeholder="令牌名称"
              maxlength="255"
              show-count
              size="large"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">描述</label>
            <n-input
              v-model:value="editTokenForm.description"
              type="textarea"
              :rows="3"
              placeholder="可选，用于备注用途"
              maxlength="1000"
              show-count
            />
          </div>
        </div>
        <template #action>
          <div class="flex justify-end gap-3">
            <button class="btn-glass px-4 py-2 rounded-lg" @click="showEditTokenModal = false">
              取消
            </button>
            <button
              class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
              :disabled="updatingToken || !editTokenForm.name.trim()"
              @click="handleUpdateToken"
            >
              <Icon v-if="updatingToken" icon="mdi:loading" class="animate-spin" />
              <span>保存</span>
            </button>
          </div>
        </template>
      </n-modal>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NModal, NInput, NEmpty, NSkeleton, useMessage } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { getSite } from '@/api/sites'
import { getSiteStats } from '@/api/stats'
import { useDocumentTitle } from '@/composables'
import { getTodayString } from '@/utils'
import type { SiteStats } from '@/api/stats'
import type { SiteToken } from '@/api/sites'

// 子组件导入
import SiteHeader from './SiteHeader.vue'
import StatCards from './StatCards.vue'
import TrendChart from './TrendChart.vue'
import PopularPages from './PopularPages.vue'
import AccessLogs from './AccessLogs.vue'
import TokenList from './TokenList.vue'
import TokenModal from './TokenModal.vue'

const route = useRoute()
const router = useRouter()
const sitesStore = useSitesStore()
const message = useMessage()

const siteId = computed(() => parseInt(route.params.id as string, 10))
const site = computed(() => sitesStore.currentSite)
const stats = ref<SiteStats | null>(null)

// 加载状态
const loading = ref(false)
const statsLoading = ref(false)

// 动态标题
useDocumentTitle(() => site.value?.title || '网站详情')

const todayViews = computed(() => {
  const today = getTodayString()
  const todayData = stats.value?.dailyViews.find(d => d.date === today)
  return todayData?.count || 0
})

// 编辑弹窗状态
const showEditModal = ref(false)
const updating = ref(false)
const editForm = ref({ title: '', description: '' })

// 令牌弹窗状态
const showTokenModal = ref(false)
const createdToken = ref('')
const creatingToken = ref(false)
const showEditTokenModal = ref(false)
const updatingToken = ref(false)
const editingTokenId = ref<number | null>(null)
const editTokenForm = ref({ name: '', description: '' })
let fetchSequence = 0

function openEditModal() {
  if (!site.value) return
  editForm.value.title = site.value.title || ''
  editForm.value.description = site.value.description || ''
  showEditModal.value = true
}

async function fetchData() {
  const sequence = ++fetchSequence
  loading.value = true
  statsLoading.value = true

  if (!Number.isFinite(siteId.value)) {
    sitesStore.setCurrentSite(null)
    stats.value = null
    loading.value = false
    statsLoading.value = false
    return
  }
  
  try {
    const [{ site: siteData }, statsData] = await Promise.all([
      getSite(siteId.value),
      getSiteStats(siteId.value)
    ])
    if (sequence !== fetchSequence) {
      return
    }
    sitesStore.setCurrentSite(siteData)
    stats.value = statsData
  } catch (error) {
    if (sequence !== fetchSequence) {
      return
    }
    sitesStore.setCurrentSite(null)
    stats.value = null
    const errorMessage = error instanceof Error ? error.message : '获取数据失败'
    message.error(errorMessage)
  } finally {
    if (sequence !== fetchSequence) {
      return
    }
    loading.value = false
    statsLoading.value = false
  }
}

async function handleUpdate() {
  updating.value = true
  try {
    await sitesStore.editSite(siteId.value, {
      title: editForm.value.title || undefined,
      description: editForm.value.description || undefined,
    })
    message.success('更新成功')
    showEditModal.value = false
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '更新失败'
    message.error(errorMessage)
  } finally {
    updating.value = false
  }
}

async function handleCreateToken(data: { name: string; description?: string }) {
  creatingToken.value = true
  try {
    const token = await sitesStore.addToken(siteId.value, data)
    createdToken.value = token.token || ''
    message.success('创建成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建失败'
    message.error(errorMessage)
  } finally {
    creatingToken.value = false
  }
}

async function deleteToken(tokenId: number) {
  try {
    await sitesStore.removeToken(siteId.value, tokenId)
    message.success('删除成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败'
    message.error(errorMessage)
  }
}

function openEditTokenModal(token: SiteToken) {
  editingTokenId.value = token.id
  editTokenForm.value = {
    name: token.name,
    description: token.description ?? '',
  }
  showEditTokenModal.value = true
}

async function handleUpdateToken() {
  if (editingTokenId.value === null) return
  const name = editTokenForm.value.name.trim()
  if (!name) {
    message.warning('请填写令牌名称')
    return
  }
  updatingToken.value = true
  try {
    await sitesStore.editToken(siteId.value, editingTokenId.value, {
      name,
      description: editTokenForm.value.description.trim(),
    })
    message.success('已更新')
    showEditTokenModal.value = false
    editingTokenId.value = null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '更新失败'
    message.error(errorMessage)
  } finally {
    updatingToken.value = false
  }
}

function resetTokenModal() {
  showTokenModal.value = false
  createdToken.value = ''
  creatingToken.value = false
}

onMounted(() => {
  void fetchData()
})

watch(() => route.params.id, () => {
  void fetchData()
})
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

:deep(.edit-modal) {
  --n-color: var(--bg-secondary) !important;
}

:deep(.edit-modal .n-dialog__title) {
  color: var(--text-primary) !important;
  font-weight: 600;
}
</style>
