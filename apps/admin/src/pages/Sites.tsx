import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { App, Button, Card, Empty, Modal, Table, Typography } from 'antd';
import {
  GlobalOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteSummary } from '@litetrack/contracts';
import { createSite, getSites, getTokens } from '../api';
import { QueryError } from '../components/QueryError';
import { SiteForm } from '../components/SiteForm';
import { analyticsUrl, projectId } from '../navigation';

export default function Sites() {
  const [created, setCreated] = useState<{ id: number; token: string }>();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(params.get('create') === '1');
  const closeForm = () => {
    setOpen(false);
    const update = new URLSearchParams(params);
    update.delete('create');
    setParams(update, { replace: true });
  };
  const { message } = App.useApp();
  const navigate = useNavigate();
  const client = useQueryClient();
  const sites = useQuery({
    queryKey: ['sites'],
    queryFn: ({ signal }) => getSites(signal),
  });
  const create = useMutation({
    mutationFn: createSite,
    onSuccess: async (site) => {
      closeForm();
      void client.invalidateQueries({ queryKey: ['sites'] });
      void client.invalidateQueries({ queryKey: ['dashboard'] });
      try {
        const tokens = await getTokens(site.id);
        setCreated({ id: site.id, token: tokens[0]?.token || '' });
      } catch {
        void message.success('项目已创建，默认 API Key 可在项目设置中查看');
        navigate('/sites/' + site.id + '/settings');
      }
    },
    onError: (error) => message.error(error.message),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>项目列表</h1>
          <Typography.Text type="secondary">
            管理网站项目、查看访问统计与接入配置
          </Typography.Text>
        </div>
        <div className="heading-actions">
          <Button
            icon={<ReloadOutlined aria-hidden />}
            loading={sites.isFetching}
            onClick={() => void sites.refetch()}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden />}
            onClick={() => setOpen(true)}
          >
            新建项目
          </Button>
        </div>
      </div>
      <QueryError error={sites.error} retry={() => void sites.refetch()} />
      <Card>
        <div className="section-heading">
          <h2>
            全部项目 <span>{sites.data?.length ?? 0}</span>
          </h2>
          <span className="muted">指标为今日数据 · Asia/Shanghai</span>
        </div>
        <Table<SiteSummary>
          rowKey="id"
          loading={sites.isPending}
          dataSource={sites.data}
          pagination={{
            pageSize: 10,
            current: Math.min(
              projectId(params.get('page')) ?? 1,
              Math.max(1, Math.ceil((sites.data?.length || 0) / 10)),
            ),
            onChange: (page) => {
              const update = new URLSearchParams(params);
              update.set('page', String(page));
              setParams(update);
            },
            showSizeChanger: false,
            hideOnSinglePage: true,
          }}
          scroll={{ x: 650 }}
          locale={{
            emptyText: (
              <Empty description="还没有项目">
                <Button type="primary" onClick={() => setOpen(true)}>
                  新建项目
                </Button>
              </Empty>
            ),
          }}
          columns={[
            {
              title: '项目',
              dataIndex: 'title',
              render: (_, site) => (
                <div className="site-cell">
                  <span className="site-mark">
                    <GlobalOutlined aria-hidden />
                  </span>
                  <div>
                    <Link className="site-name" to={analyticsUrl(site.id)}>
                      {site.title}
                    </Link>
                    <Typography.Text type="secondary" className="domain">
                      {site.domain}
                    </Typography.Text>
                  </div>
                </div>
              ),
            },
            {
              title: '今日 PV',
              align: 'right',
              render: (_, site) => site.today.pv.toLocaleString(),
            },
            {
              title: '今日 UV',
              align: 'right',
              render: (_, site) => site.today.uv.toLocaleString(),
            },
            {
              title: '今日访问次数',
              align: 'right',
              render: (_, site) => site.today.visits.toLocaleString(),
            },
            {
              title: '操作',
              width: 180,
              render: (_, site) => (
                <div className="heading-actions">
                  <Link to={analyticsUrl(site.id)}>访问统计</Link>
                  <Link to={'/sites/' + site.id + '/settings'}>项目设置</Link>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title="项目创建成功"
        open={Boolean(created)}
        onCancel={() => setCreated(undefined)}
        footer={[
          <Button key="close" onClick={() => setCreated(undefined)}>
            稍后接入
          </Button>,
          <Button
            key="access"
            type="primary"
            onClick={() => {
              if (created) navigate('/integration?project=' + created.id);
            }}
          >
            前往接入指南
          </Button>,
        ]}
      >
        <Typography.Paragraph>
          默认 API Key 已自动生成。复制后即可用于 SDK
          采集，也可以随时在项目设置中查看。
        </Typography.Paragraph>
        <Typography.Paragraph
          code
          copyable={{
            text: created?.token,
            tooltips: ['复制 API Key', '已复制'],
          }}
          className="api-key"
        >
          {created?.token}
        </Typography.Paragraph>
      </Modal>
      <SiteForm
        open={open}
        loading={create.isPending}
        onCancel={closeForm}
        onSave={(input) => create.mutate(input)}
      />
    </>
  );
}
