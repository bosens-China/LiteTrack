<template>
  <el-dialog
    v-model="showModal"
    title="创建访问令牌"
    :width="480"
    class="token-modal"
    :close-on-click-modal="!createdToken"
    :show-close="!createdToken"
  >
    <el-form v-if="!createdToken" label-position="top">
      <el-form-item label="令牌名称" required>
        <el-input v-model="formData.name" placeholder="例如：生产环境" />
        <div class="form-hint">用于标识此令牌的用途</div>
      </el-form-item>

      <el-form-item label="描述（可选）">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="添加更多关于此令牌的说明"
        />
      </el-form-item>
    </el-form>

    <div v-else class="space-y-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
        <Icon icon="mdi:alert-circle" class="text-amber-600 text-lg" />
        <p class="text-sm text-amber-700">请立即保存此令牌，它只会显示一次。</p>
      </div>

      <div class="relative">
        <el-input
          :model-value="createdToken"
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
    </div>

    <template #footer>
      <el-button
        v-if="createdToken"
        type="primary"
        class="w-full"
        @click="handleClose"
      >
        <Icon icon="mdi:check" class="mr-1" />
        我已保存
      </el-button>
      <template v-else>
        <el-button @click="showModal = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creating"
          :disabled="!formData.name.trim()"
          @click="handleCreate"
        >
          创建
        </el-button>
      </template>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useClipboard } from '@/composables'

interface Props {
  show: boolean
  createdToken: string
  creating: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  create: [data: { name: string; description?: string }]
  close: []
}>()

const { copy } = useClipboard({
  onSuccess: () => {
    ElMessage.success('已复制到剪贴板')
  },
  onError: () => {
    ElMessage.error('复制失败')
  },
})

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const formData = ref({
  name: '',
  description: '',
})

function handleCreate() {
  if (!formData.value.name.trim()) return

  const data = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
  }
  emit('create', data)
}

async function copyToken() {
  await copy(props.createdToken)
}

function handleClose() {
  emit('close')
  formData.value.name = ''
  formData.value.description = ''
}

watch(
  () => props.show,
  (visible) => {
    if (!visible && !props.createdToken) {
      formData.value.name = ''
      formData.value.description = ''
    }
  },
)
</script>

<style scoped>
.form-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
