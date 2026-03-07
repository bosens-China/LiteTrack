<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="创建新网站"
    style="width: 600px; max-width: 90vw"
    :bordered="false"
    segmented
  >
    <n-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="100"
      require-mark-placement="right-hanging"
    >
      <n-form-item label="网站名称" path="title">
        <n-input
          v-model:value="formData.title"
          placeholder="输入网站名称（可选）"
          maxlength="255"
          show-count
          clearable
        />
      </n-form-item>

      <n-form-item label="域名" path="domain">
        <n-input
          v-model:value="formData.domain"
          placeholder="example.com"
          maxlength="255"
          clearable
        />
      </n-form-item>

      <n-form-item label="描述" path="description">
        <n-input
          v-model:value="formData.description"
          type="textarea"
          placeholder="输入网站描述（可选）"
          maxlength="1000"
          show-count
          :rows="3"
        />
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="flex justify-end gap-3">
        <n-button @click="close">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">
          创建
        </n-button>
      </div>
    </template>
  </n-modal>

  <!-- 创建成功 - 显示令牌 -->
  <n-modal
    v-model:show="showTokenModal"
    preset="dialog"
    title="网站创建成功"
    positive-text="复制并关闭"
    :closable="false"
    @positive-click="copyAndClose"
  >
    <div class="space-y-4">
      <p>请妥善保存以下访问令牌，它只会显示一次：</p>
      <n-input :value="createdToken" type="textarea" readonly :rows="3" />
      <p class="text-sm text-gray-500">将此令牌配置到 SDK 后即可开始统计访问数据。</p>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NButton,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { useSitesStore } from '@/stores/sites'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'success': [siteId: number]
}>()

const sitesStore = useSitesStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
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

const rules: FormRules = {
  domain: [
    { required: true, message: '请输入域名', trigger: 'blur' },
    { min: 1, max: 255, message: '长度在 1-255 个字符', trigger: 'blur' },
  ],
  title: [{ max: 255, message: '长度不能超过 255 个字符', trigger: 'blur' }],
  description: [{ max: 1000, message: '长度不能超过 1000 个字符', trigger: 'blur' }],
}

function resetForm() {
  formData.value = {
    title: '',
    domain: '',
    description: '',
  }
  formRef.value?.restoreValidation()
}

function close() {
  visible.value = false
  resetForm()
}

async function handleSubmit() {
  await formRef.value?.validate()

  submitting.value = true
  try {
    const result = await sitesStore.addSite({
      title: formData.value.title || undefined,
      domain: formData.value.domain,
      description: formData.value.description || undefined,
    })

    createdToken.value = result.token
    createdSiteId.value = result.site.id
    showTokenModal.value = true
    
    // 关闭创建弹窗
    visible.value = false
    resetForm()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建失败'
    message.error(errorMessage)
  } finally {
    submitting.value = false
  }
}

function copyAndClose() {
  void navigator.clipboard.writeText(createdToken.value)
  message.success('已复制到剪贴板')
  
  // 通知父组件创建成功
  if (createdSiteId.value !== null) {
    emit('success', createdSiteId.value)
  }
  
  showTokenModal.value = false
  createdToken.value = ''
  createdSiteId.value = null
}

// 监听 show 变化，打开时重置表单
watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>
