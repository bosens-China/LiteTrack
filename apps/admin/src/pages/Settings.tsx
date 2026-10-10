import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  App,
  Button,
  Input,
  Modal,
  Popconfirm,
  Skeleton,
  Switch,
  Table,
  Tooltip,
} from 'antd';
import { ArrowLeft, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteInput, SiteToken } from '@litetrack/contracts';
import {
  createToken,
  deleteSite,
  deleteToken,
  getSite,
  getTokens,
  toggleToken,
  updateSite,
} from '../api';
import { QueryError } from '../components/QueryError';
import { SiteForm } from '../components/SiteForm';
import { SdkAccess } from '../components/SdkAccess';

export default function Settings() {
  const id = Number(useParams().id);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const client = useQueryClient();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const site = useQuery({
    queryKey: ['site', id],
    queryFn: ({ signal }) => getSite(id, signal),
  });
  const tokens = useQuery({
    queryKey: ['tokens', id],
    queryFn: ({ signal }) => getTokens(id, signal),
  });
  const refreshTokens = () => {
    void client.invalidateQueries({ queryKey: ['tokens', id] });
  };
  const onError = (error: Error) => message.error(error.message);
  const save = useMutation({
    mutationFn: (input: SiteInput) => updateSite(id, input),
    onSuccess: () => {
      setEditing(false);
      void client.invalidateQueries({ queryKey: ['site', id] });
      void client.invalidateQueries({ queryKey: ['sites'] });
      void message.success('项目已保存');
    },
    onError,
  });
  const create = useMutation({
    mutationFn: () => createToken(id, name.trim()),
    onSuccess: () => {
      void message.success('API Key 已创建');
      setCreating(false);
      setName('');
      refreshTokens();
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: ({ tokenId, active }: { tokenId: number; active: boolean }) =>
      toggleToken(id, tokenId, active),
    onSuccess: refreshTokens,
    onError,
  });
  const removeToken = useMutation({
    mutationFn: (tokenId: number) => deleteToken(id, tokenId),
    onSuccess: refreshTokens,
    onError,
  });
  const remove = useMutation({
    mutationFn: () => deleteSite(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['sites'] });
      navigate('/');
    },
    onError,
  });
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      void message.success('已复制');
    } catch {
      void message.error('复制失败，请手动选择文本');
    }
  };
  return (
    <>
      <Link className="back-link" to={'/sites/' + id}>
        <ArrowLeft size={15} />
        访问统计
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{site.data?.domain || '项目'}</span>
          <h1>项目设置</h1>
        </div>
      </div>
      <QueryError error={site.error} retry={() => void site.refetch()} />
      <section className="data-section">
        <div className="section-heading">
          <h2>基本信息</h2>
          <Button
            icon={<Pencil size={15} />}
            onClick={() => setEditing(true)}
            disabled={!site.data}
          >
            编辑项目
          </Button>
        </div>
        {site.isPending ? (
          <Skeleton active />
        ) : (
          <dl className="site-details">
            <div>
              <dt>名称</dt>
              <dd>{site.data?.title}</dd>
            </div>
            <div>
              <dt>域名</dt>
              <dd>{site.data?.domain}</dd>
            </div>
            <div>
              <dt>备注</dt>
              <dd>{site.data?.description || '—'}</dd>
            </div>
          </dl>
        )}
      </section>
      <section className="data-section">
        <div className="section-heading">
          <h2>项目 API Key</h2>
          <Button icon={<Plus size={15} />} onClick={() => setCreating(true)}>
            创建 API Key
          </Button>
        </div>
        <QueryError error={tokens.error} retry={() => void tokens.refetch()} />
        <Table<SiteToken>
          rowKey="id"
          dataSource={tokens.data}
          loading={tokens.isPending}
          pagination={false}
          scroll={{ x: 540 }}
          columns={[
            { title: '名称', dataIndex: 'name' },
            {
              title: 'API Key',
              width: 280,
              render: (_, token) => (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input.Password
                    readOnly
                    value={token.token}
                    aria-label={'API Key ' + token.name}
                  />
                  <Tooltip title="复制 API Key">
                    <Button
                      aria-label={'复制 API Key ' + token.name}
                      icon={<Copy size={16} />}
                      onClick={() => void copy(token.token)}
                    />
                  </Tooltip>
                </div>
              ),
            },
            {
              title: '启用',
              width: 90,
              render: (_, token) => (
                <Switch
                  aria-label={'启用 ' + token.name}
                  checked={token.isActive}
                  disabled={toggle.isPending}
                  loading={
                    toggle.isPending && toggle.variables?.tokenId === token.id
                  }
                  onChange={(active) =>
                    toggle.mutate({ tokenId: token.id, active })
                  }
                />
              ),
            },
            {
              title: '',
              width: 60,
              render: (_, token) => (
                <Popconfirm
                  title="删除此 API Key？"
                  description="使用它的项目将无法继续上报。"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => removeToken.mutateAsync(token.id)}
                >
                  <Tooltip title="删除 API Key">
                    <Button
                      danger
                      type="text"
                      aria-label={'删除 ' + token.name}
                      loading={
                        removeToken.isPending &&
                        removeToken.variables === token.id
                      }
                      icon={<Trash2 size={16} />}
                    />
                  </Tooltip>
                </Popconfirm>
              ),
            },
          ]}
        />
      </section>
      <SdkAccess tokens={tokens.data || []} onCopy={copy} />
      <section className="danger-section">
        <div>
          <h2>删除项目</h2>
          <span className="muted">该项目的统计事件和 API Key 将永久删除。</span>
        </div>
        <Button
          danger
          loading={remove.isPending}
          icon={<Trash2 size={16} />}
          onClick={() =>
            modal.confirm({
              title: '永久删除 ' + (site.data?.title || '项目') + '？',
              content: '此操作无法恢复，会删除全部统计事件、会话和 API Key。',
              okText: '永久删除',
              okButtonProps: { danger: true },
              cancelText: '取消',
              onOk: () => remove.mutateAsync(),
            })
          }
        >
          删除项目
        </Button>
      </section>
      <SiteForm
        open={editing}
        initial={site.data}
        loading={save.isPending}
        onCancel={() => setEditing(false)}
        onSave={(input) => save.mutate(input)}
      />
      <Modal
        title="创建 API Key"
        open={creating}
        onCancel={() => setCreating(false)}
        okText="创建"
        cancelText="取消"
        okButtonProps={{ disabled: !name.trim() }}
        confirmLoading={create.isPending}
        onOk={() => create.mutate()}
      >
        <Input
          aria-label="API Key 名称"
          placeholder="API Key 名称"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginTop: 20 }}
        />
      </Modal>
    </>
  );
}
