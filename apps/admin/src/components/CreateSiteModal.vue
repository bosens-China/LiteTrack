<template>
  <!-- 创建网站弹窗 -->
  <n-modal
    v-model:show="visible"
    preset="card"
    title="创建新网站"
    class="create-modal"
    style="width: 600px; max-width: 90vw"
    :bordered="false"
    segmented
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
          网站名称
        </label>
        <n-input
          v-model:value="formData.title"
          placeholder="输入网站名称（可选）"
          maxlength="255"
          show-count
          clearable
          size="large"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
          域名 <span class="text-rose-400">*</span>
        </label>
        <n-input
          v-model:value="formData.domain"
          placeholder="example.com"
          maxlength="255"
          clearable
          size="large"
        />
        <p class="text-xs text-[var(--text-muted)] mt-1">输入网站域名，不需要包含 http:// 或 https://</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">
          描述
        </label>
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="输入网站描述（可选）"
          maxlength="1000"
          show-count
          :rows="3"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <button class="btn-glass px-4 py-2 rounded-lg" @click="close">
          取消
        </button>
        <button 
          class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          :disabled="submitting || !formData.domain.trim()"
          @click="handleSubmit"
        >
          <Icon v-if="submitting" icon="mdi:loading" class="animate-spin" />
          <span>创建</span>
        </button>
      </div>
    </template>
  </n-modal>

  <!-- 创建成功 - 显示令牌 -->
  <n-modal
    v-model:show="showTokenModal"
    preset="dialog"
    title="网站创建成功"
    class="token-modal"
    :closable="false"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
        <Icon icon="mdi:check-circle" class="text-emerald-600 text-xl" />
        <p class="text-emerald-700 font-medium">网站创建成功</p>
      </div>
      
      <p class="text-sm text-[var(--text-secondary)]">请立即保存以下访问令牌，它只会显示一次：</p>
      
      <div class="relative">
        <n-input 
          :value="createdToken" 
          type="textarea" 
          readonly 
          :rows="3"
          class="font-mono text-sm"
        />
        <button 
          class="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          title="复制"
          @click="copyToken"
        >
          <Icon icon="mdi:content-copy" />
        </button>
      </div>
      
      <p class="text-sm text-[var(--text-muted)]">复制成功后会直接进入新建站点详情页。</p>
    </div>

    <template #action>
      <button 
        class="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
        @click="copyAndClose"
      >
        <Icon icon="mdi:content-copy" />
        复制并关闭
      </button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  NModal,
  NInput,
  useMessage,
} from 'naive-ui'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { useClipboard } from '@/composables'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'success': [siteId: number]
}>()

const sitesStore = useSitesStore()
const message = useMessage()
const { copy } = useClipboard({
  onSuccess: () => {
    message.success('已复制到剪贴板')
  },
  onError: () => {
    message.error('复制失败')
  },
})

const submitting = ref(false)
const showTokenModal = ref(false)
const createdToken = ref('')
const createdSiteId = ref<number | null>(null)

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const formData = ref({
  title: '',
  domain: '',
  description: '',
})

function resetForm() {
  formData.value = {
    title: '',
    domain: '',
    description: '',
  }
}

function close() {
  visible.value = false
  resetForm()
}

async function handleSubmit() {
  if (!formData.value.domain.trim()) return

  submitting.value = true
  try {
    const result = await sitesStore.addSite({
      title: formData.value.title || undefined,
      domain: formData.value.domain.trim(),
      description: formData.value.description || undefined,
    })

    createdToken.value = result.token
    createdSiteId.value = result.site.id
    showTokenModal.value = true
    
    visible.value = false
    resetForm()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建失败'
    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

async function copyToken() {
  await copy(createdToken.value)
}

async function copyAndClose() {
  const copied = await copy(createdToken.value)
  if (!copied) {
    return
  }

  if (createdSiteId.value !== null) {
    emit('success', createdSiteId.value)
  }
  
  showTokenModal.value = false
  createdToken.value = ''
  createdSiteId.value = null
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
:deep(.create-modal) {
  --n-color: var(--bg-secondary) !important;
}

:deep(.create-modal .n-card-header__main) {
  color: var(--text-primary) !important;
  font-weight: 600;
}

:deep(.token-modal) {
  --n-color: var(--bg-secondary) !important;
}

:deep(.token-modal .n-dialog__title) {
  color: var(--text-primary) !important;
  font-weight: 600;
}
</style>
