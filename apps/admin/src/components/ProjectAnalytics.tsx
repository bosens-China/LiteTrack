import { Link, useSearchParams } from 'react-router';
import { Button, Skeleton, Table, Card, Typography } from 'antd';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { type PageRow, type ReferrerRow } from '@litetrack/contracts';
import { getOverview, getPages, getReferrers, getSite, getTrend } from '../api';
import { QueryError } from './QueryError';
import { TrendChart } from './TrendChart';
import { useDateRange } from './DateRangeFilter';
import { MetricsCards } from './MetricsCards';

export function ProjectAnalytics({ id }: { id: number }) {
  const [params, setParams] = useSearchParams();
  const range = useDateRange();
  const rawPage = Number(params.get('page') || 1);
  const page =
    Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1000000
      ? rawPage
      : 1;
  const site = useQuery({
    queryKey: ['site', id],
    queryFn: ({ signal }) => getSite(id, signal),
  });
  const overview = useQuery({
    enabled: site.isSuccess,
    queryKey: ['overview', id, range],
    queryFn: ({ signal }) => getOverview(id, range, signal),
  });
  const trend = useQuery({
    enabled: site.isSuccess,
    queryKey: ['trend', id, range],
    queryFn: ({ signal }) => getTrend(id, range, signal),
  });
  const pages = useQuery({
    enabled: site.isSuccess,
    queryKey: ['pages', id, range, page],
    queryFn: ({ signal }) => getPages(id, range, page, signal),
  });
  const referrers = useQuery({
    enabled: site.isSuccess,
    queryKey: ['referrers', id, range],
    queryFn: ({ signal }) => getReferrers(id, range, signal),
  });
  const refresh = () => {
    void overview.refetch();
    void trend.refetch();
    void pages.refetch();
    void referrers.refetch();
  };
  if (site.error)
    return <QueryError error={site.error} retry={() => void site.refetch()} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>{site.data?.title || '访问统计'}</h2>
          <Typography.Text type="secondary" className="heading-meta">
            {site.data?.domain || '项目统计'}
          </Typography.Text>
        </div>
        <div className="heading-actions">
          <Button
            icon={<ReloadOutlined aria-hidden />}
            onClick={refresh}
            loading={overview.isFetching}
          >
            刷新
          </Button>
          <Link to={'/integration?project=' + id}>
            <Button>接入指南</Button>
          </Link>
          <Link to={'/sites/' + id + '/settings'}>
            <Button icon={<SettingOutlined aria-hidden />}>项目设置</Button>
          </Link>
        </div>
      </div>
      <QueryError
        error={overview.error}
        retry={() => void overview.refetch()}
      />
      <MetricsCards data={overview.data} loading={overview.isPending} />
      <Card
        title="访问趋势"
        className="section-card"
        extra={
          <Typography.Text type="secondary">
            {range.start} 至 {range.end}
          </Typography.Text>
        }
      >
        <QueryError error={trend.error} retry={() => void trend.refetch()} />
        {trend.isPending ? (
          <Skeleton active style={{ height: 280 }} />
        ) : (
          <TrendChart data={trend.data || []} />
        )}
      </Card>
      <div className="analytics-grid">
        <Card title="热门页面">
          <QueryError error={pages.error} retry={() => void pages.refetch()} />
          <Table<PageRow>
            size="middle"
            rowKey="path"
            dataSource={pages.data?.items}
            loading={pages.isPending}
            scroll={{ x: 340 }}
            pagination={{
              current: page,
              pageSize: 20,
              total: pages.data?.total,
              showSizeChanger: false,
              onChange: (next) => {
                const update = new URLSearchParams(params);
                update.set('page', String(next));
                setParams(update);
              },
            }}
            columns={[
              {
                title: '页面',
                dataIndex: 'path',
                ellipsis: true,
                render: (path: string, row) => (
                  <div className="page-cell">
                    <span title={row.title || path}>{row.title || path}</span>
                    {row.title && <small title={path}>{path}</small>}
                  </div>
                ),
              },
              { title: 'PV', dataIndex: 'pv', align: 'right', width: 70 },
              { title: 'UV', dataIndex: 'uv', align: 'right', width: 70 },
            ]}
          />
        </Card>
        <Card
          title="访问来源"
          extra={<Typography.Text type="secondary">按访问次数</Typography.Text>}
        >
          <QueryError
            error={referrers.error}
            retry={() => void referrers.refetch()}
          />
          <Table<ReferrerRow>
            size="middle"
            rowKey="domain"
            dataSource={referrers.data}
            loading={referrers.isPending}
            pagination={false}
            columns={[
              {
                title: '来源域名',
                dataIndex: 'domain',
                ellipsis: true,
                render: (value: string) =>
                  value === 'direct' ? '直接 / 未知' : value,
              },
              {
                title: '访问次数',
                dataIndex: 'visits',
                align: 'right',
                width: 90,
              },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
