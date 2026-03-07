<template>
  <div v-if="site" class="space-y-6">
    <SiteHeader 
      :site="site" 
      @edit="openEditModal"
    />
    
    <StatCards 
      :stats="stats" 
      :today-views="todayViews"
    />
    
    <TrendChart 
      :daily-views="stats?.dailyViews ?? []"
    />
    
    <PopularPages 
      :pages="stats?.popularPages ?? []"
    />
    
    <TokenList 
      :tokens="site.tokens"
      @create="showTokenModal = true"
      @delete="deleteToken"
    />

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑网站">
      <n-form :model="editForm" label-placement="left" label-width="80">
        <n-form-item label="名称（可选）">
          <n-input v-model:value="editForm.title" />
        </n-form-item>
        <n-form-item label="描述（可选）">
          <n-input v-model:value="editForm.description" type="textarea" :rows="3" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showEditModal = false">取消</n-button>
        <n-button type="primary" :loading="updating" @click="handleUpdate">保存</n-button>
      </template>
    </n-modal>

    <!-- 创建令牌弹窗 -->
    <TokenModal
      v-model:show="showTokenModal"
      :site-id="siteId"
      :created-token="createdToken"
      @create="handleCreateToken"
      @close="resetTokenModal"
    />
  </div>

  <n-spin v-else class="w-full h-64 flex items-center justify-center" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { NModal, NForm, NFormItem, NInput, NButton, NSpin, useMessage } from 'naive-ui'
import { useSitesStore } from '@/stores/sites'
import { getSite } from '@/api/sites'
import { getSiteStats } from '@/api/stats'
import { useDocumentTitle } from '@/composables'
import type { SiteStats } from '@/api/stats'

// 子组件导入
import SiteHeader from './SiteHeader.vue'
import StatCards from './StatCards.vue'
import TrendChart from './TrendChart.vue'
import PopularPages from './PopularPages.vue'
import TokenList from './TokenList.vue'
import TokenModal from './TokenModal.vue'

const route = useRoute()
const sitesStore = useSitesStore()
const message = useMessage()

const siteId = computed(() => parseInt(route.params.id as string, 10))
const site = computed(() => sitesStore.currentSite)
const stats = ref<SiteStats | null>(null)

// 动态标题 - 使用 MaybeRefOrGetter 支持
useDocumentTitle(() => site.value?.title || '网站详情')

const todayViews = computed(() => {
  const today = new Date().toLocaleDateString('sv-SE')
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

function openEditModal() {
  if (!site.value) return
  editForm.value.title = site.value.title || ''
  editForm.value.description = site.value.description || ''
  showEditModal.value = true
}

async function fetchData() {
  try {
    const [{ site: siteData }, statsData] = await Promise.all([
      getSite(siteId.value),
      getSiteStats(siteId.value)
    ])
    sitesStore.setCurrentSite(siteData)
    stats.value = statsData
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '获取数据失败'
    message.error(errorMessage)
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
  try {
    const token = await sitesStore.addToken(siteId.value, data)
    createdToken.value = token.token || ''
    message.success('创建成功')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建失败'
    message.error(errorMessage)
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

function resetTokenModal() {
  showTokenModal.value = false
  createdToken.value = ''
}

onMounted(() => {
  void fetchData()
})

watch(() => route.params.id, () => {
  void fetchData()
})
</script>
