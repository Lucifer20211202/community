<template>
  <arco-drawer
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 1050 ? 1050 : '100%'"
    @before-ok="save"
    @close="reset"
  >
    <arco-tabs v-model:active-key="activeKey">
      <arco-tab-pane key="1" title="生成配置">
        <arco-form ref="formRef" :model="form" :rules="rules" class="gen-config" size="large">
          <arco-form-item label="作者名称" field="author">
            <arco-input v-model="form.author" placeholder="请输入作者名称" />
          </arco-form-item>
          <arco-form-item label="业务名称" field="businessName">
            <arco-input v-model="form.businessName" placeholder="自定义业务名称，例如：用户" />
          </arco-form-item>
          <arco-form-item label="所属模块" field="moduleName">
            <arco-input v-model="form.moduleName" placeholder="项目模块名称，例如：continew-admin-system" />
          </arco-form-item>
          <arco-form-item label="模块包名" field="packageName">
            <arco-input v-model="form.packageName" placeholder="项目模块包名，例如：top.continew.admin.system" />
          </arco-form-item>
          <arco-form-item label="去表前缀" field="tablePrefix">
            <arco-input v-model="form.tablePrefix" placeholder="数据库表前缀，例如：sys_" />
          </arco-form-item>
          <arco-form-item label="是否覆盖" field="isOverride">
            <arco-radio-group v-model="form.isOverride" type="button">
              <arco-radio :value="true">是</arco-radio>
              <arco-radio :value="false">否</arco-radio>
            </arco-radio-group>
          </arco-form-item>
        </arco-form>
      </arco-tab-pane>
      <arco-tab-pane key="2" title="字段配置">
        <GiTable
          row-key="tableName"
          :data="dataList"
          :columns="columns"
          :loading="loading"
          :scroll="{ x: '100%', y: 800, minWidth: 900 }"
          :pagination="false"
          :disabled-tools="['setting', 'refresh']"
          :disabled-column-keys="['tableName']"
        >
          <template #custom-left>
            <arco-popconfirm
              content="是否确定同步最新数据表结构？同步后只要不点击确定保存，则不影响原有配置数据。"
              type="warning"
              @ok="handleRefresh(form.tableName)"
            >
              <arco-tooltip content="同步最新数据表结构">
                <arco-button
                  type="primary"
                  status="success"
                  size="small"
                  title="同步"
                  :disabled="dataList.length !== 0 && dataList[0].createTime == null"
                >
                  <template #icon><icon-sync /></template>同步
                </arco-button>
              </arco-tooltip>
            </arco-popconfirm>
          </template>
          <template #fieldType="{ record }">
            <span v-if="record.fieldType">{{ record.fieldType }}</span>
            <arco-tooltip v-else content="请检查 generator.properties 配置">
              <icon-exclamation-circle-fill size="large" style="color: #f53f3f" />
            </arco-tooltip>
          </template>
          <template #comment="{ record }">
            <arco-input v-model="record.comment" />
          </template>
          <template #showInList="{ record }">
            <arco-checkbox v-model="record.showInList" value="true" />
          </template>
          <template #showInForm="{ record }">
            <arco-checkbox v-model="record.showInForm" value="true" />
          </template>
          <template #isRequired="{ record }">
            <arco-checkbox v-if="record.showInForm" v-model="record.isRequired" value="true" />
            <arco-checkbox v-else disabled />
          </template>
          <template #showInQuery="{ record }">
            <arco-checkbox v-model="record.showInQuery" value="true" />
          </template>
          <template #formType="{ record }">
<!--            <arco-select-->
<!--              v-if="record.showInForm || record.showInQuery"-->
<!--              v-model="record.formType"-->
<!--              :options="form_type_enum"-->
<!--              placeholder="请选择表单类型"-->
<!--            />-->
            <span >无需设置</span>
          </template>
          <template #queryType="{ record }">
<!--            <arco-select-->
<!--              v-if="record.showInQuery"-->
<!--              v-model="record.queryType"-->
<!--              :options="query_type_enum"-->
<!--              placeholder="请选择查询方式"-->
<!--            />-->
            <span >无需设置</span>
          </template>
        </GiTable>
      </arco-tab-pane>
    </arco-tabs>
  </arco-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { type FormInstance, Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { type FieldConfigResp, type GeneratorConfigResp, getGenConfig, listFieldConfig, saveGenConfig } from '@/api'
import type { TableInstanceColumns } from '../../compontents/GiTable/type'
import { useForm } from '@/hooks'
import GiTable from "@/views/system/compontents/GiTable/index.vue";
// import { useDict } from '@/hooks/app'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()
const { width } = useWindowSize()
// const { form_type_enum, query_type_enum } = useDict('form_type_enum', 'query_type_enum')

// Table 字段配置
const columns: TableInstanceColumns[] = [
  { title: '名称', dataIndex: 'fieldName', width: 125, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'fieldType' },
  { title: '描述', slotName: 'comment', width: 170 },
  { title: '列表', slotName: 'showInList', width: 60, align: 'center' },
  { title: '表单', slotName: 'showInForm', width: 60, align: 'center' },
  { title: '必填', slotName: 'isRequired', width: 60, align: 'center' },
  { title: '查询', slotName: 'showInQuery', width: 60, align: 'center' },
  { title: '表单类型', slotName: 'formType', width: 150 },
  { title: '查询方式', slotName: 'queryType' }
]

const dataList = ref<FieldConfigResp[]>([])
const loading = ref(false)
// 查询列表数据
const getDataList = async (tableName: string, requireSync: boolean) => {
  try {
    loading.value = true
    const res = await listFieldConfig(tableName, requireSync)
    dataList.value = res.data.data
  } finally {
    loading.value = false
  }
}

// Form 生成配置
const formRef = ref<FormInstance>()
const rules: FormInstance['rules'] = {
  author: [{ required: true, message: '请输入作者名称' }],
  moduleName: [{ required: true, message: '请输入所属模块' }],
  packageName: [{ required: true, message: '请输入模块包名' }],
  businessName: [{ required: true, message: '请输入业务名称' }]
}

const { form, resetForm } = useForm({
  isOverride: false
})

// 重置
const reset = () => {
  formRef.value?.resetFields()
  resetForm()
}

const title = ref('')
const visible = ref(false)
// 配置
const onConfig = async (tableName: string, comment: string) => {
  comment = comment ? `（${comment}）` : ' '
  title.value = `${tableName}${comment}配置`
  visible.value = true
  // 查询字段配置
  await getDataList(tableName, false)
  // 查询生成配置
  const res = await getGenConfig(tableName)
  Object.assign(form, res.data.data)
  form.isOverride = false
}

// 同步
const handleRefresh = async (tableName: string) => {
  await getDataList(tableName, true)
}

const activeKey = ref('1')
// 保存
const save = async () => {
  try {
    const isInvalid = await formRef.value?.validate()
    if (isInvalid) {
      activeKey.value = '1'
      return false
    }
    await saveGenConfig(form.tableName, {
      genConfig: form,
      fieldConfigs: dataList.value
    } as GeneratorConfigResp)
    Message.success('保存成功')
    emit('save-success')
    return true
  } catch (error) {
    return false
  }
}

defineExpose({ onConfig })
</script>

<style lang="scss" scoped>
:deep(.gen-config.arco-form) {
  width: 50%;
}
</style>
