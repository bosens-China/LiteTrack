<template>
  <n-modal 
    v-model:show="showModal" 
    preset="dialog" 
    title="创建访问令牌"
    class="token-modal"
    :closable="!createdToken"
  >
    <div v-if="!createdToken" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">
          令牌名称 <span class="text-rose-400">*</span>
        </label>
        <n-input 
          v-model:value="formData.name" 
          placeholder="例如：生产环境"
          size="large"
        />
        <p class="text-xs text-slate-500 mt-1">用于标识此令牌的用途</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-slate-300 mb-2">描述（可选）</label>
        <n-input 
          v-model:value="formData.description" 
          type="textarea" 
          :rows="3"
          placeholder="添加更多关于此令牌的说明"
        />
      </div>
    </div>
    
    <div v-else class="space-y-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <Icon icon="mdi:alert-circle" class="text-amber-400 text-lg" />
        <p class="text-sm text-amber-400">请立即保存此令牌，它只会显示一次！</p>
      </div>
      
      <div class="relative">
        <n-input 
          :value="createdToken" 
          type="textarea" 
          readonly 
          :rows="3"
          class="font-mono text-sm"
        />
        <button 
          class="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
          title="复制"
          @click="copyToken"
        >
          <Icon icon="mdi:content-copy" />
        </button>
      </div>
    </div>

    <template #action>
      <template v-if="createdToken">
        <button 
          class="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
          @click="handleClose"
        >
          <Icon icon="mdi:check" />
          我已保存
        </button>
      </template>
      <template v-else>
        <div class="flex justify-end gap-3">
          <button class="btn-glass px-4 py-2 rounded-lg" @click="showModal = false">
            取消
          </button>
          <button 
            class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            :disabled="loading || !formData.name.trim()"
            @click="handleCreate"
          >
            <Icon v-if="loading" icon="mdi:loading" class="animate-spin" />
            <span>创建</span>
          </button>
        </div>
      </template>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  NModal, 
  NInput,
  useMessage,
} from 'naive-ui'
import { Icon } from '@iconify/vue'

interface Props {
  show: boolean
  siteId: number
  createdToken: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  create: [data: { name: string; description?: string }]
  close: []
}>()

const message = useMessage()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const loading = ref(false)
const formData = ref({
  name: '',
  description: '',
})

async function handleCreate() {
  if (!formData.value.name.trim()) return
  
  loading.value = true
  const data = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
  }
  
  emit('create', data)
  loading.value = false
}

async function copyToken() {
  try {
    await navigator.clipboard.writeText(props.createdToken)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}

function handleClose() {
  emit('close')
  formData.value.name = ''
  formData.value.description = ''
}
</script>

<style scoped>
:deep(.token-modal) {
  --n-color: var(--bg-secondary) !important;
}

:deep(.token-modal .n-dialog__title) {
  color: var(--text-primary) !important;
  font-weight: 600;
}
</style>
