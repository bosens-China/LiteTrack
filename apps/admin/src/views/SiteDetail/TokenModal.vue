<template>
  <n-modal 
    v-model:show="showModal" 
    preset="dialog" 
    title="创建访问令牌"
    :closable="!createdToken"
  >
    <n-form 
      v-if="!createdToken" 
      ref="formRef"
      :model="formData" 
      :rules="rules"
      label-placement="left" 
      label-width="80"
    >
      <n-form-item label="名称" path="name">
        <n-input 
          v-model:value="formData.name" 
          placeholder="例如：生产环境" 
        />
      </n-form-item>
      <n-form-item label="描述（可选）">
        <n-input 
          v-model:value="formData.description" 
          type="textarea" 
          :rows="3" 
        />
      </n-form-item>
    </n-form>
    
    <div v-else class="space-y-4">
      <p class="text-sm text-gray-500">请保存此令牌，它只会显示一次：</p>
      <n-input :value="createdToken" type="textarea" readonly :rows="3" />
    </div>

    <template #action>
      <template v-if="createdToken">
        <n-button type="primary" block @click="handleCopyAndClose">
          复制并关闭
        </n-button>
      </template>
      <template v-else>
        <n-button @click="showModal = false">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleCreate">
          创建
        </n-button>
      </template>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  NModal, 
  NForm, 
  NFormItem, 
  NInput, 
  NButton, 
  useMessage,
  type FormInst,
  type FormRules
} from 'naive-ui'

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

const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const formData = ref({
  name: '',
  description: '',
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入令牌名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1-50 个字符', trigger: 'blur' },
  ],
}

async function handleCreate() {
  await formRef.value?.validate()
  
  const data = {
    name: formData.value.name.trim(),
    description: formData.value.description || undefined,
  }
  
  emit('create', data)
}

async function handleCopyAndClose() {
  try {
    await navigator.clipboard.writeText(props.createdToken)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
  emit('close')
  formData.value.name = ''
  formData.value.description = ''
}
</script>
