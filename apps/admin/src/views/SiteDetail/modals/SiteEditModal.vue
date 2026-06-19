<template>
  <el-dialog
    v-model="show"
    title="编辑网站信息"
    :width="480"
    class="edit-modal"
  >
    <el-form label-position="top">
      <el-form-item label="网站名称">
        <el-input v-model="title" placeholder="输入网站名称（可选）" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input
          v-model="description"
          type="textarea"
          :rows="3"
          placeholder="输入网站描述（可选）"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="show = false">取消</el-button>
      <el-button type="primary" :loading="updating" @click="$emit('save')">
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
const title = defineModel<string>('title', { required: true })
const description = defineModel<string>('description', { required: true })
</script>
