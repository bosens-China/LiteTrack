import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { App, Button, Empty, Table, Tooltip, Typography } from 'antd';
import {
  ArrowUpRight,
  Plus,
  RefreshCw,
  Globe,
  Eye,
  Users,
  Route,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SiteSummary } from '@litetrack/contracts';
import { createSite, getSites } from '../api';
import { QueryError } from '../components/QueryError';
import { SiteForm } from '../components/SiteForm';

export default function Sites() {
  const [open, setOpen] = useState(false);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const client = useQueryClient();
  const sites = useQuery({
    queryKey: ['sites'],
    queryFn: ({ signal }) => getSites(signal),
  });
  const create = useMutation({
    mutationFn: createSite,
    onSuccess: (site) => {
      setOpen(false);
      void client.invalidateQueries({ queryKey: ['sites'] });
      navigate('/sites/' + site.id + '/settings');
    },
    onError: (error) => message.error(error.message),
  });
  const sum = sites.data?.reduce(
    (total, site) => ({
      pv: total.pv + site.today.pv,
      uv: total.uv + site.today.uv,
      visits: total.visits + site.today.visits,
    }),
    { pv: 0, uv: 0, visits: 0 },
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">项目总览</span>
          <h1>我的项目</h1>
        </div>
        <div className="heading-actions">
          <Tooltip title="刷新">
            <Button
              aria-label="刷新项目"
              icon={<RefreshCw size={16} />}
              loading={sites.isFetching}
              onClick={() => void sites.refetch()}
            />
          </Tooltip>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => setOpen(true)}
          >
            新建项目
          </Button>
        </div>
      </div>
      <QueryError error={sites.error} retry={() => void sites.refetch()} />
      <div className="metrics-strip">
        {[
          { label: '今日浏览量', value: sum?.pv, icon: Eye },
          { label: '今日项目访客合计', value: sum?.uv, icon: Users },
          { label: '今日访问次数', value: sum?.visits, icon: Route },
        ].map(({ label, value, icon: Icon }) => (
          <div className="metric" key={label}>
            <span>
              <Icon size={16} />
              {label}
            </span>
            <strong>
              {sites.isPending ? '...' : (value?.toLocaleString() ?? '—')}
            </strong>
          </div>
        ))}
      </div>
      <section className="data-section">
        <div className="section-heading">
          <h2>
            全部项目 <span>{sites.data?.length ?? 0}</span>
          </h2>
          <span className="muted">今日 · Asia/Shanghai</span>
        </div>
        <Table<SiteSummary>
          rowKey="id"
          loading={sites.isPending}
          dataSource={sites.data}
          pagination={false}
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
                    <Globe size={20} />
                  </span>
                  <div>
                    <Link className="site-name" to={'/sites/' + site.id}>
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
              title: 'PV',
              align: 'right',
              render: (_, site) => site.today.pv.toLocaleString(),
            },
            {
              title: 'UV',
              align: 'right',
              render: (_, site) => site.today.uv.toLocaleString(),
            },
            {
              title: 'Visits',
              align: 'right',
              render: (_, site) => site.today.visits.toLocaleString(),
            },
            {
              title: '',
              width: 60,
              render: (_, site) => (
                <Tooltip title="查看统计">
                  <Link
                    aria-label={'查看 ' + site.title}
                    to={'/sites/' + site.id}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </Tooltip>
              ),
            },
          ]}
        />
      </section>
      <SiteForm
        open={open}
        loading={create.isPending}
        onCancel={() => setOpen(false)}
        onSave={(input) => create.mutate(input)}
      />
    </>
  );
}
