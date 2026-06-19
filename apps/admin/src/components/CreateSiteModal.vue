<template>
  <!-- 创建网站弹窗 -->
  <el-dialog
    v-model="visible"
    title="创建新网站"
    :width="600"
    class="create-modal"
    @closed="resetForm"
  >
    <el-form label-position="top">
      <el-form-item label="网站名称">
        <el-input
          v-model="formData.title"
          placeholder="输入网站名称（可选）"
          maxlength="255"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="域名" required>
        <el-input
          v-model="formData.domain"
          placeholder="example.com"
          maxlength="255"
          clearable
        />
        <div class="form-hint">输入网站域名，不需要包含 http:// 或 https://</div>
      </el-form-item>

      <el-form-item label="描述">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="输入网站描述（可选）"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button
        type="primary"
        :loading="submitting"
        :disabled="!formData.domain.trim()"
        @click="handleSubmit"
      >
        创建
      </el-button>
    </template>
  </el-dialog>

  <!-- 创建成功 - 显示令牌 -->
  <el-dialog
    v-model="showTokenModal"
    title="网站创建成功"
    :width="480"
    class="token-modal"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
        <Icon icon="mdi:check-circle" class="text-emerald-600 text-xl" />
        <p class="text-emerald-700 font-medium">网站创建成功</p>
      </div>

      <p class="text-sm text-[var(--text-secondary)]">请立即保存以下访问令牌，它只会显示一次：</p>

      <div class="relative rounded-lg border border-[var(--border-soft)] bg-[var(--bg-tertiary)] p-3 pr-12">
        <pre
          class="m-0 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-sm text-[var(--text-primary)] select-all"
          tabindex="0"
        >{{ createdToken }}</pre>
        <button
          type="button"
          class="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
          title="复制"
          @click="copyToken"
        >
          <Icon icon="mdi:content-copy" />
        </button>
      </div>

      <p class="text-sm text-[var(--text-muted)]">关闭弹窗后可在「网站管理」中查看该站点；需要统计详情时再进入站点页。</p>
    </div>

    <template #footer>
      <el-button type="primary" class="w-full" @click="copyAndClose">
        <Icon icon="mdi:content-copy" class="mr-1" />
        复制并关闭
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Icon } from '@iconify/vue'
import { useSitesStore } from '@/stores/sites'
import { useClipboard } from '@/composables'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const sitesStore = useSitesStore()
const { copy } = useClipboard({
  onSuccess: () => {
    ElMessage.success('已复制到剪贴板')
  },
  onError: () => {
    ElMessage.error('复制失败')
  },
})

const submitting = ref(false)
const showTokenModal = ref(false)
const createdToken = ref('')

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
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
    showTokenModal.value = true

    visible.value = false
    resetForm()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建失败'
    ElMessage.error(errorMessage)
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
  showTokenModal.value = false
}

watch(showTokenModal, (open) => {
  if (!open) {
    createdToken.value = ''
  }
})

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      resetForm()
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
