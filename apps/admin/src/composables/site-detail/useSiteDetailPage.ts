import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { useSitesStore } from '@/stores/sites'
import { getSite, type SiteToken } from '@/api/sites'
import { getSiteStats, type SiteStats } from '@/api/stats'
import { useDocumentTitle } from '@/composables'
import { getTodayString } from '@/utils'

export function useSiteDetailPage(siteId: () => number) {
  const sitesStore = useSitesStore()
  const message = useMessage()

  const site = computed(() => sitesStore.currentSite)
  const stats = ref<SiteStats | null>(null)
  const loading = ref(false)
  const statsLoading = ref(false)

  useDocumentTitle(() => site.value?.title || '网站详情')

  const todayViews = computed(() => {
    const today = getTodayString()
    const todayData = stats.value?.dailyViews.find((item) => item.date === today)
    return todayData?.count || 0
  })

  const showEditModal = ref(false)
  const updating = ref(false)
  const editSiteTitle = ref('')
  const editSiteDescription = ref('')

  const showTokenModal = ref(false)
  const createdToken = ref('')
  const creatingToken = ref(false)

  const showEditTokenModal = ref(false)
  const updatingToken = ref(false)
  const editingTokenId = ref<number | null>(null)
  const editTokenName = ref('')
  const editTokenDescription = ref('')

  let fetchSequence = 0

  function openEditModal() {
    if (!site.value) {
      return
    }

    editSiteTitle.value = site.value.title || ''
    editSiteDescription.value = site.value.description || ''
    showEditModal.value = true
  }

  async function fetchData() {
    const sequence = ++fetchSequence
    loading.value = true
    statsLoading.value = true

    if (!Number.isFinite(siteId())) {
      sitesStore.setCurrentSite(null)
      stats.value = null
      loading.value = false
      statsLoading.value = false
      return
    }

    try {
      const [{ site: siteData }, statsData] = await Promise.all([
        getSite(siteId()),
        getSiteStats(siteId()),
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
      message.error(error instanceof Error ? error.message : '获取数据失败')
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
      await sitesStore.editSite(siteId(), {
        title: editSiteTitle.value || undefined,
        description: editSiteDescription.value || undefined,
      })
      message.success('更新成功')
      showEditModal.value = false
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      updating.value = false
    }
  }

  async function handleCreateToken(data: { name: string; description?: string }) {
    creatingToken.value = true

    try {
      const token = await sitesStore.addToken(siteId(), data)
      createdToken.value = token.token || ''
      message.success('创建成功')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      creatingToken.value = false
    }
  }

  async function deleteToken(tokenId: number) {
    try {
      await sitesStore.removeToken(siteId(), tokenId)
      message.success('删除成功')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  function openEditTokenModal(token: SiteToken) {
    editingTokenId.value = token.id
    editTokenName.value = token.name
    editTokenDescription.value = token.description ?? ''
    showEditTokenModal.value = true
  }

  async function handleUpdateToken() {
    if (editingTokenId.value === null) {
      return
    }

    const name = editTokenName.value.trim()
    if (!name) {
      message.warning('请填写令牌名称')
      return
    }

    updatingToken.value = true

    try {
      await sitesStore.editToken(siteId(), editingTokenId.value, {
        name,
        description: editTokenDescription.value.trim(),
      })
      message.success('已更新')
      showEditTokenModal.value = false
      editingTokenId.value = null
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      updatingToken.value = false
    }
  }

  function resetTokenModal() {
    showTokenModal.value = false
    createdToken.value = ''
    creatingToken.value = false
  }

  watch(
    siteId,
    () => {
      void fetchData()
    },
    { immediate: true },
  )

  return {
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
  }
}
