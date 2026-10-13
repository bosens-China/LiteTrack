import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { App, Alert, Button, Skeleton, Card, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteInput } from '@litetrack/contracts';
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
import { ProjectSelect } from '../components/ProjectSelect';
import { FilterCard } from '../components/FilterCard';
import { TokenTable } from '../components/TokenTable';
import { analyticsUrl, projectId } from '../navigation';

function ProjectSettings({ id }: { id: number }) {
  const [editing, setEditing] = useState(false);
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
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void message.success('项目已保存');
    },
    onError,
  });
  const create = useMutation({
    mutationFn: () => createToken(id, '默认 API Key'),
    onSuccess: (token) => {
      refreshTokens();
      modal.success({
        title: 'API Key 已生成',
        content: (
          <Typography.Paragraph
            code
            copyable={{
              text: token.token,
              tooltips: ['复制 API Key', '已复制'],
            }}
            className="api-key"
          >
            {token.token}
          </Typography.Paragraph>
        ),
        okText: '完成',
      });
    },
    onError,
  });
  const toggle = useMutation({
    mutationFn: ({ tokenId, active }: { tokenId: number; active: boolean }) =>
      toggleToken(id, tokenId, active),
    onSuccess: () => {
      refreshTokens();
      void message.success('API Key 状态已更新');
    },
    onError,
  });
  const removeToken = useMutation({
    mutationFn: (tokenId: number) => deleteToken(id, tokenId),
    onSuccess: () => {
      refreshTokens();
      void message.success('API Key 已删除');
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: () => deleteSite(id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['sites'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      void message.success('项目已删除');
      navigate('/sites');
    },
    onError,
  });
  if (site.error)
    return <QueryError error={site.error} retry={() => void site.refetch()} />;
  return (
    <>
      <Card className="section-card">
        <div className="section-heading">
          <h2>基本信息</h2>
          <Button
            icon={<EditOutlined aria-hidden />}
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
      </Card>
      <Card className="section-card">
        <div className="section-heading">
          <h2>项目 API Key</h2>
          {!tokens.isPending &&
            !tokens.error &&
            !tokens.data?.some((item) => item.isActive) && (
              <Button
                loading={create.isPending}
                onClick={() => create.mutate()}
              >
                生成可用 API Key
              </Button>
            )}
        </div>
        <QueryError error={tokens.error} retry={() => void tokens.refetch()} />
        <TokenTable
          tokens={tokens.data}
          loading={tokens.isPending}
          togglingId={toggle.isPending ? toggle.variables?.tokenId : undefined}
          removingId={removeToken.isPending ? removeToken.variables : undefined}
          onToggle={(tokenId, active) => toggle.mutate({ tokenId, active })}
          onRemove={(tokenId) => removeToken.mutateAsync(tokenId)}
        />
      </Card>
      <Card className="danger-section">
        <div className="danger-actions">
          <div>
            <h2>删除项目</h2>
            <span className="muted">
              该项目的统计事件和 API Key 将永久删除。
            </span>
          </div>
          <Button
            danger
            loading={remove.isPending}
            disabled={!site.data}
            icon={<DeleteOutlined aria-hidden />}
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
        </div>
      </Card>
      <SiteForm
        open={editing}
        initial={site.data}
        loading={save.isPending}
        onCancel={() => setEditing(false)}
        onSave={(input) => save.mutate(input)}
      />
    </>
  );
}

export default function Settings() {
  const selected = useParams().id || null;
  const id = projectId(selected);
  const navigate = useNavigate();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>项目设置</h1>
          <Typography.Text type="secondary">
            管理项目资料和采集 API Key
          </Typography.Text>
        </div>
        {id && (
          <div className="heading-actions">
            <Link to={analyticsUrl(id)}>
              <Button>访问统计</Button>
            </Link>
            <Link to={'/integration?project=' + id}>
              <Button type="primary">接入指南</Button>
            </Link>
          </div>
        )}
      </div>
      <FilterCard>
        <ProjectSelect
          value={selected}
          allowAll={false}
          onChange={(next) =>
            navigate(next ? '/sites/' + next + '/settings' : '/sites/settings')
          }
        />
      </FilterCard>
      {selected && !id ? (
        <Alert type="error" showIcon title="项目参数无效，请重新选择项目。" />
      ) : id ? (
        <ProjectSettings key={id} id={id} />
      ) : (
        <Card>
          <Typography.Paragraph type="secondary">
            请选择要管理的项目。SDK 文件和 AI Skills 可在接入指南中查看。
          </Typography.Paragraph>
          <Link to="/sites">返回项目列表</Link>
        </Card>
      )}
    </>
  );
}
