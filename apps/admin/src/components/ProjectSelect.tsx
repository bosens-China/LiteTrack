import { Select, Typography } from 'antd';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { getSites } from '../api';
import { QueryError } from './QueryError';

export function ProjectSelect({
  value,
  onChange,
  allowAll = true,
  allLabel = '全部项目',
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  allowAll?: boolean;
  allLabel?: string;
}) {
  const sites = useQuery({
    queryKey: ['sites'],
    queryFn: ({ signal }) => getSites(signal),
  });
  const options = [
    ...(allowAll ? [{ value: 'all', label: allLabel }] : []),
    ...(sites.data || []).map((site) => ({
      value: String(site.id),
      label: site.title + ' · ' + site.domain,
    })),
    ...(value &&
    sites.data &&
    !sites.data.some((site) => String(site.id) === value)
      ? [{ value, label: '项目不存在或无权访问', disabled: true }]
      : []),
  ];
  return (
    <div className="project-filter">
      <Typography.Text>选择项目</Typography.Text>
      <Select
        aria-label="选择项目"
        className="project-select"
        showSearch
        optionFilterProp="label"
        placeholder="请选择项目"
        value={value || (allowAll ? 'all' : undefined)}
        options={options}
        loading={sites.isPending}
        disabled={sites.isPending || Boolean(sites.error)}
        onChange={(next) => onChange(next === 'all' ? null : next)}
      />
      <QueryError error={sites.error} retry={() => void sites.refetch()} />
      {sites.data?.length === 0 && (
        <Link to="/sites?create=1">新建第一个项目</Link>
      )}
    </div>
  );
}
