import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import { siteInputSchema, type SiteInput } from '@litetrack/contracts';

export function SiteForm({
  open,
  initial,
  loading,
  onCancel,
  onSave,
}: {
  open: boolean;
  initial?: SiteInput;
  loading: boolean;
  onCancel: () => void;
  onSave: (input: SiteInput) => void;
}) {
  const [form] = Form.useForm<SiteInput>();
  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue(
        initial || { domain: '', title: '', description: '' },
      );
    }
  }, [open, initial, form]);
  return (
    <Modal
      title={initial ? '编辑项目' : '新建项目'}
      open={open}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="保存项目"
      cancelText="取消"
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSave}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          name="title"
          label="项目名称"
          rules={[
            {
              required: true,
              whitespace: true,
              max: 100,
              message: '请输入项目名称，最多 100 字',
            },
          ]}
        >
          <Input autoFocus maxLength={100} />
        </Form.Item>
        <Form.Item
          name="domain"
          label="域名"
          rules={[
            {
              validator: async (_, value: unknown) => {
                const result = siteInputSchema.shape.domain.safeParse(value);
                if (!result.success)
                  throw new Error('请输入域名，例如 blog.example.com');
              },
            },
          ]}
        >
          <Input placeholder="blog.example.com" maxLength={253} />
        </Form.Item>
        <Form.Item name="description" label="备注">
          <Input.TextArea maxLength={500} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
