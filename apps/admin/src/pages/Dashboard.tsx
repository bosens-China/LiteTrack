import { Link, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  Empty,
  Progress,
  Skeleton,
  Table,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api';
import { QueryError } from '../components/QueryError';
import { MetricsCards } from '../components/MetricsCards';
import { DateRangeFilter, useDateRange } from '../components/DateRangeFilter';
import { TrendChart } from '../components/TrendChart';
import { ProjectSelect } from '../components/ProjectSelect';
import { ProjectAnalytics } from '../components/ProjectAnalytics';
import { FilterCard } from '../components/FilterCard';
import { analyticsUrl, projectId } from '../navigation';

function GlobalOverview() {
  const range = useDateRange();
  const summary = useQuery({
    queryKey: ['dashboard', range],
    queryFn: ({ signal }) => getDashboard(range, signal),
  });
  const data = summary.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <h2>全部项目汇总</h2>
          <Typography.Text type="secondary" className="heading-meta">
            汇总当前账户下所有项目的访问数据
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined aria-hidden />}
          loading={summary.isFetching}
          onClick={() => void summary.refetch()}
        >
          刷新
        </Button>
      </div>
      <QueryError error={summary.error} retry={() => void summary.refetch()} />
      <MetricsCards
        loading={summary.isPending}
        data={data?.overview}
        projects={data?.projects.length ?? null}
      />
      {data && !data.projects.length ? (
        <Card>
          <Empty description="还没有项目">
            <Link to="/sites?create=1">
              <Button type="primary">新建项目</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <>
          <Card
            title="整体访问趋势"
            className="section-card"
            extra={
              <Typography.Text type="secondary">
                {range.start} 至 {range.end}
              </Typography.Text>
            }
          >
            {summary.isPending ? (
              <Skeleton active style={{ height: 285 }} />
            ) : (
              data && <TrendChart data={data.trend} aggregate />
            )}
          </Card>
          <div className="analytics-grid">
            <Card
              title="项目访问排行"
              extra={<Link to="/sites">管理项目</Link>}
            >
              <Table
                rowKey="id"
                loading={summary.isPending}
                dataSource={data?.projects
                  .slice()
                  .sort((a, b) => b.metrics.pv - a.metrics.pv || a.id - b.id)}
                scroll={{ x: 450 }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                  hideOnSinglePage: true,
                }}
                columns={[
                  {
                    title: '项目',
                    render: (_, project) => (
                      <div>
                        <Link
                          to={analyticsUrl(
                            project.id,
                            new URLSearchParams({
                              ...range,
                              mode: 'custom',
                            }).toString(),
                          )}
                        >
                          {project.title}
                        </Link>
                        <Typography.Text type="secondary" className="domain">
                          {project.domain}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    title: 'PV',
                    align: 'right',
                    render: (_, project) => project.metrics.pv.toLocaleString(),
                  },
                  {
                    title: 'UV',
                    align: 'right',
                    render: (_, project) => project.metrics.uv.toLocaleString(),
                  },
                  {
                    title: '访问次数',
                    align: 'right',
                    render: (_, project) =>
                      project.metrics.visits.toLocaleString(),
                  },
                ]}
              />
            </Card>
            <Card
              title="访问来源"
              extra={
                <Typography.Text type="secondary">
                  前 20 项 · 按访问次数
                </Typography.Text>
              }
            >
              <Table
                rowKey="domain"
                loading={summary.isPending}
                dataSource={data?.referrers}
                pagination={false}
                columns={[
                  {
                    title: '来源',
                    dataIndex: 'domain',
                    ellipsis: true,
                    render: (domain: string) =>
                      domain === 'direct' ? '直接 / 未知' : domain,
                  },
                  {
                    title: '访问次数 / 占比',
                    width: 160,
                    render: (_, row) => (
                      <>
                        <Typography.Text>
                          {row.visits.toLocaleString()}
                        </Typography.Text>
                        <Progress
                          status="normal"
                          percent={
                            data?.overview.visits
                              ? Math.round(
                                  (row.visits / data.overview.visits) * 100,
                                )
                              : 0
                          }
                          size="small"
                        />
                      </>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </>
      )}
      <Typography.Paragraph type="secondary" className="summary-note">
        统计口径：项目访客合计为各项目区间 UV
        之和，不代表跨项目去重人数；统计日按 Asia/Shanghai 划分。
      </Typography.Paragraph>
    </>
  );
}

export default function Dashboard() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('project') || null;
  const id = projectId(selected);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>数据总览</h1>
          <Typography.Text type="secondary">
            切换全部项目或单个项目，查看访问表现与流量来源
          </Typography.Text>
        </div>
      </div>
      <FilterCard>
        <ProjectSelect
          value={selected}
          onChange={(next) => {
            const update = new URLSearchParams(params);
            if (next) update.set('project', next);
            else update.delete('project');
            update.delete('page');
            setParams(update);
          }}
        />
        <DateRangeFilter />
      </FilterCard>
      {!selected ? (
        <GlobalOverview />
      ) : id ? (
        <ProjectAnalytics key={id} id={id} />
      ) : (
        <Alert showIcon type="error" title="项目参数无效，请重新选择项目。" />
      )}
    </>
  );
}
