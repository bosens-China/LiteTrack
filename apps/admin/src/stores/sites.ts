import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Site, SiteDetail, CreateSiteData, UpdateSiteData, UpdateTokenData } from '@/api/sites'
import {
  getSites,
  createSite,
  updateSite,
  deleteSite,
  createToken,
  updateToken,
  deleteToken,
} from '@/api/sites'

export const useSitesStore = defineStore('sites', () => {
  // State
  const sites = ref<Site[]>([])
  const currentSite = ref<SiteDetail | null>(null)
  const loading = ref(false)

  // Actions
  /**
   * 获取网站列表
   */
  async function fetchSites() {
    loading.value = true
    try {
      const { sites: sitesData } = await getSites()
      sites.value = sitesData
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建网站
   */
  async function addSite(data: CreateSiteData) {
    const result = await createSite(data)
    await fetchSites()
    return result
  }

  /**
   * 更新网站
   */
  async function editSite(id: number, data: UpdateSiteData) {
    const { site } = await updateSite(id, data)
    // 更新本地数据
    const index = sites.value.findIndex(s => s.id === id)
    if (index !== -1) {
      sites.value[index] = { ...sites.value[index], ...site }
    }
    if (currentSite.value?.id === id) {
      currentSite.value = { ...currentSite.value, ...site, tokens: currentSite.value.tokens }
    }
    return site
  }

  /**
   * 删除网站
   */
  async function removeSite(id: number) {
    await deleteSite(id)
    sites.value = sites.value.filter(s => s.id !== id)
    if (currentSite.value?.id === id) {
      currentSite.value = null
    }
  }

  /**
   * 设置当前网站
   */
  function setCurrentSite(site: SiteDetail | null) {
    currentSite.value = site
  }

  /**
   * 创建令牌
   */
  async function addToken(siteId: number, data: { name: string; description?: string }) {
    const { token } = await createToken(siteId, data)
    if (currentSite.value?.id === siteId) {
      const tokenMeta = {
        id: token.id,
        name: token.name,
        description: token.description,
        isActive: token.isActive,
        createdAt: token.createdAt,
      }
      currentSite.value.tokens.unshift(tokenMeta)
    }
    return token
  }

  /**
   * 更新令牌元信息
   */
  async function editToken(siteId: number, tokenId: number, data: UpdateTokenData) {
    const { token } = await updateToken(siteId, tokenId, data)
    if (currentSite.value?.id === siteId) {
      const idx = currentSite.value.tokens.findIndex((t) => t.id === tokenId)
      if (idx !== -1) {
        currentSite.value.tokens[idx] = { ...currentSite.value.tokens[idx], ...token }
      }
    }
    return token
  }

  /**
   * 删除令牌
   */
  async function removeToken(siteId: number, tokenId: number) {
    await deleteToken(siteId, tokenId)
    if (currentSite.value?.id === siteId) {
      currentSite.value.tokens = currentSite.value.tokens.filter(t => t.id !== tokenId)
    }
  }

  return {
    sites,
    currentSite,
    loading,
    fetchSites,
    addSite,
    editSite,
    removeSite,
    setCurrentSite,
    addToken,
    editToken,
    removeToken,
  }
})
