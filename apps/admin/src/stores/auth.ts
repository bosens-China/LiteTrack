import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/auth'
import { getCurrentUser } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string>(localStorage.getItem('token') || '')
  const loading = ref(false)

  // Getters
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const username = computed(() => user.value?.username || '')
  const avatar = computed(() => user.value?.avatar || '')

  // Actions
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  /**
   * 获取当前用户信息
   */
  async function fetchUser() {
    if (!token.value) return
    
    loading.value = true
    try {
      const { user: userData } = await getCurrentUser()
      user.value = userData
    } catch (error) {
      console.error('获取用户信息失败:', error)
      logout()
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    isLoggedIn,
    username,
    avatar,
    setToken,
    setUser,
    logout,
    fetchUser,
  }
})
