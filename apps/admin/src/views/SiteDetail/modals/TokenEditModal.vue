<template>
  <n-modal
    v-model:show="show"
    preset="dialog"
    title="编辑访问令牌"
    class="edit-modal"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">名称</label>
        <n-input
          v-model:value="name"
          placeholder="令牌名称"
          maxlength="255"
          show-count
          size="large"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-[var(--text-primary)] mb-2">描述</label>
        <n-input
          v-model:value="description"
          type="textarea"
          :rows="3"
          placeholder="可选，用于备注用途"
          maxlength="1000"
          show-count
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-end gap-3">
        <button class="btn-glass px-4 py-2 rounded-lg" @click="show = false">
          取消
        </button>
        <button
          class="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          :disabled="updating || !name.trim()"
          @click="$emit('save')"
        >
          <Icon v-if="updating" icon="mdi:loading" class="animate-spin" />
          <span>保存</span>
        </button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { NInput, NModal } from 'naive-ui'

defineProps<{
  updating: boolean
}>()

defineEmits<{
  save: []
}>()

const show = defineModel<boolean>('show', { required: true })
const name = defineModel<string>('name', { required: true })
const description = defineModel<string>('description', { required: true })
</script>

<style scoped>
:deep(.edit-modal) {
  --n-color: var(--bg-secondary) !important;
}

:deep(.edit-modal .n-dialog__title) {
  color: var(--text-primary) !important;
  font-weight: 600;
}
</style>
