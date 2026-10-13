import { Card, Skeleton, Space, Statistic, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { Metrics } from '@litetrack/contracts';

export function MetricsCards({
  data,
  loading,
  projects,
}: {
  data?: Metrics;
  loading: boolean;
  projects?: number | null;
}) {
  const items = [
    ...(projects === undefined
      ? []
      : [
          {
            label: '项目总数',
            value: projects ?? undefined,
            hint: '当前账户管理的全部项目',
          },
        ]),
    {
      label: '浏览量（PV）',
      value: data?.pv,
      hint: '所选日期范围内的页面浏览次数',
    },
    {
      label: projects === undefined ? '独立访客（UV）' : '项目访客合计（UV）',
      value: data?.uv,
      hint:
        projects === undefined
          ? '所选日期范围内去重的访客，不累加每日 UV'
          : '各项目的区间 UV 相加，同一访客访问不同项目会分别计数',
    },
    {
      label: '访问次数（Visits）',
      value: data?.visits,
      hint: '所选日期范围内开始的会话，30 分钟无页面事件后重新开始',
    },
  ];
  return (
    <div
      className="metrics-cards"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <Card key={item.label}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 1 }} />
          ) : (
            <Statistic
              title={
                <Space size={4}>
                  {item.label}
                  <Tooltip title={item.hint}>
                    <InfoCircleOutlined
                      tabIndex={0}
                      aria-label={item.label + '说明'}
                    />
                  </Tooltip>
                </Space>
              }
              value={item.value ?? '—'}
            />
          )}
        </Card>
      ))}
    </div>
  );
}
