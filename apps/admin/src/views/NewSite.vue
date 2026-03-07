<template>
  <div class="max-w-2xl mx-auto">
    <n-card title="创建新网站">
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="100"
        require-mark-placement="right-hanging"
      >
        <n-form-item label="网站名称（可选）" path="title">
          <n-input
            v-model:value="formData.title"
            placeholder="输入网站名称（可选）"
            maxlength="255"
            show-count
          />
        </n-form-item>

        <n-form-item label="域名" path="domain">
          <n-input
            v-model:value="formData.domain"
            placeholder="example.com"
            maxlength="255"
          />
        </n-form-item>

        <n-form-item label="描述（可选）" path="description">
          <n-input
            v-model:value="formData.description"
            type="textarea"
            placeholder="输入网站描述（可选）"
            maxlength="1000"
            show-count
            :rows="3"
          />
        </n-form-item>

        <div class="flex justify-end gap-4">
          <n-button @click="router.back()">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">
            创建
          </n-button>
        </div>
      </n-form>

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
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NModal,
  useMessage,
  type FormInst,
  type FormRules,
} from 'naive-ui'
import { useSitesStore } from '@/stores/sites'

const router = useRouter()
const sitesStore = useSitesStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const submitting = ref(false)
const showTokenModal = ref(false)
const createdToken = ref('')
const createdSiteId = ref<number | null>(null)

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

  if (createdSiteId.value !== null) {
    void router.push(`/sites/${createdSiteId.value}`)
    return
  }

  void router.push('/sites')
}
</script>
