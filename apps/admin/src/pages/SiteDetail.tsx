import { Link, useParams, useSearchParams } from 'react-router';
import {
  App,
  Button,
  DatePicker,
  Segmented,
  Skeleton,
  Table,
  Tooltip,
} from 'antd';
import {
  ArrowLeft,
  Settings,
  RefreshCw,
  Eye,
  Users,
  Route,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  rangeSchema,
  type PageRow,
  type ReferrerRow,
} from '@litetrack/contracts';
import { getOverview, getPages, getReferrers, getSite, getTrend } from '../api';
import { QueryError } from '../components/QueryError';
import { TrendChart } from '../components/TrendChart';

const today = () =>
  dayjs(new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10));
export default function SiteDetail() {
  const { message } = App.useApp();
  const id = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const fallback = {
    start: today().subtract(6, 'day').format('YYYY-MM-DD'),
    end: today().format('YYYY-MM-DD'),
  };
  const parsed = rangeSchema.safeParse({
    start: params.get('start'),
    end: params.get('end'),
  });
  const range = parsed.success ? parsed.data : fallback;
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
    queryKey: ['overview', id, range],
    queryFn: ({ signal }) => getOverview(id, range, signal),
  });
  const trend = useQuery({
    queryKey: ['trend', id, range],
    queryFn: ({ signal }) => getTrend(id, range, signal),
  });
  const pages = useQuery({
    queryKey: ['pages', id, range, page],
    queryFn: ({ signal }) => getPages(id, range, page, signal),
  });
  const referrers = useQuery({
    queryKey: ['referrers', id, range],
    queryFn: ({ signal }) => getReferrers(id, range, signal),
  });
  const setRange = (start: string, end: string, mode: string) => {
    if (!rangeSchema.safeParse({ start, end }).success) {
      void message.warning('日期范围不能超过 366 天');
      return;
    }
    setParams({ start, end, mode });
  };
  const refresh = () => {
    void overview.refetch();
    void trend.refetch();
    void pages.refetch();
    void referrers.refetch();
  };
  return (
    <>
      <Link className="back-link" to="/">
        <ArrowLeft size={15} />
        全部项目
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{site.data?.domain || '项目统计'}</span>
          <h1>{site.data?.title || '访问统计'}</h1>
        </div>
        <div className="heading-actions">
          <Tooltip title="刷新">
            <Button
              aria-label="刷新统计"
              icon={<RefreshCw size={16} />}
              onClick={refresh}
              loading={overview.isFetching}
            />
          </Tooltip>
          <Link to={'/sites/' + id + '/settings'}>
            <Button icon={<Settings size={16} />}>项目设置</Button>
          </Link>
        </div>
      </div>
      <QueryError error={site.error} retry={() => void site.refetch()} />
      <div className="date-toolbar">
        <Segmented
          value={params.get('mode') || '7'}
          options={[
            { label: '近 7 天', value: '7' },
            { label: '近 30 天', value: '30' },
            { label: '自定义', value: 'custom' },
          ]}
          onChange={(mode) => {
            if (mode === 'custom') setRange(range.start, range.end, mode);
            else
              setRange(
                today()
                  .subtract(Number(mode) - 1, 'day')
                  .format('YYYY-MM-DD'),
                today().format('YYYY-MM-DD'),
                String(mode),
              );
          }}
        />
        <DatePicker.RangePicker
          allowClear={false}
          value={[dayjs(range.start), dayjs(range.end)]}
          disabledDate={(date) => date.isAfter(today(), 'day')}
          onChange={(dates) => {
            if (dates?.[0] && dates[1])
              setRange(
                dates[0].format('YYYY-MM-DD'),
                dates[1].format('YYYY-MM-DD'),
                'custom',
              );
          }}
        />
        <span className="muted">Asia/Shanghai</span>
      </div>
      <QueryError
        error={overview.error}
        retry={() => void overview.refetch()}
      />
      <div className="metrics-strip">
        {[
          { key: 'pv' as const, label: '页面浏览量', icon: Eye },
          { key: 'uv' as const, label: '独立访客', icon: Users },
          { key: 'visits' as const, label: '访问次数', icon: Route },
        ].map(({ key, label, icon: Icon }) => (
          <div key={key} className="metric">
            <span>
              <Icon size={16} />
              {label}
            </span>
            <strong>
              {overview.isPending
                ? '...'
                : (overview.data?.[key].toLocaleString() ?? '—')}
            </strong>
            <small>{key.toUpperCase()}</small>
          </div>
        ))}
      </div>
      <section className="data-section">
        <div className="section-heading">
          <h2>访问趋势</h2>
          <span className="muted">
            {range.start} 至 {range.end}
          </span>
        </div>
        <QueryError error={trend.error} retry={() => void trend.refetch()} />
        {trend.isPending ? (
          <Skeleton active style={{ height: 280 }} />
        ) : (
          <TrendChart data={trend.data || []} />
        )}
      </section>
      <div className="analytics-grid">
        <section className="data-section">
          <div className="section-heading">
            <h2>热门页面</h2>
          </div>
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
        </section>
        <section className="data-section">
          <div className="section-heading">
            <h2>访问来源</h2>
            <span className="muted">Visits</span>
          </div>
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
        </section>
      </div>
    </>
  );
}
