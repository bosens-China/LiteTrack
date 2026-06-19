<template>
  <el-dialog
    v-model="show"
    title="编辑访问令牌"
    :width="480"
    class="edit-modal"
  >
    <el-form label-position="top">
      <el-form-item label="名称">
        <el-input
          v-model="name"
          placeholder="令牌名称"
          maxlength="255"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="description"
          type="textarea"
          :rows="3"
          placeholder="可选，用于备注用途"
          maxlength="1000"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="show = false">取消</el-button>
      <el-button
        type="primary"
        :loading="updating"
        :disabled="!name.trim()"
        @click="$emit('save')"
      >
        保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
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
