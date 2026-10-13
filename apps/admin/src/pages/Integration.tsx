import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Alert, App, Card, Select, Skeleton, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getTokens } from '../api';
import { projectId } from '../navigation';
import { ProjectSelect } from '../components/ProjectSelect';
import { FilterCard } from '../components/FilterCard';
import { QueryError } from '../components/QueryError';
import { SdkAccess } from '../components/SdkAccess';

export default function Integration() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('project');
  const id = projectId(selected);
  const [selectedKey, setSelectedKey] = useState('');
  const { message } = App.useApp();
  const tokens = useQuery({
    queryKey: ['tokens', id],
    queryFn: ({ signal }) => getTokens(id!, signal),
    enabled: id !== undefined,
  });
  const active = tokens.error
    ? []
    : (tokens.data || []).filter((token) => token.isActive);
  const token =
    active.find((item) => item.token === selectedKey)?.token ||
    active[0]?.token;
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
      <div className="page-heading">
        <div>
          <h1>接入指南</h1>
          <Typography.Text type="secondary">
            SDK、接入示例与 AI Skills 在这里统一维护
          </Typography.Text>
        </div>
      </div>
      <FilterCard>
        <ProjectSelect
          value={selected}
          allLabel="通用接入指南"
          onChange={(next) => {
            const update = new URLSearchParams(params);
            if (next) update.set('project', next);
            else update.delete('project');
            setSelectedKey('');
            setParams(update);
          }}
        />
        {!selected ? (
          <Alert
            type="info"
            showIcon
            title="选择项目后，接入示例会自动填入 API Key；也可以直接阅读指南、下载文件或安装 Skills。"
          />
        ) : !id ? (
          <Alert type="error" showIcon title="项目参数无效，请重新选择项目。" />
        ) : (
          <>
            <QueryError
              error={tokens.error}
              retry={() => void tokens.refetch()}
            />
            {tokens.isPending ? (
              <Skeleton active paragraph={{ rows: 1 }} />
            ) : (
              !tokens.error &&
              (active.length ? (
                <div className="project-filter">
                  <Typography.Text>采集 API Key</Typography.Text>
                  <Select
                    aria-label="接入 API Key"
                    className="project-select"
                    value={token}
                    options={active.map((item) => ({
                      label: item.name,
                      value: item.token,
                    }))}
                    onChange={setSelectedKey}
                  />
                  <Link to={'/sites/' + id + '/settings'}>项目设置</Link>
                </div>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  title="该项目暂无启用的 API Key"
                  description={
                    <Link to={'/sites/' + id + '/settings'}>
                      前往项目设置启用或生成 API Key
                    </Link>
                  }
                />
              ))
            )}
          </>
        )}
      </FilterCard>
      <Card>
        <SdkAccess token={token} onCopy={copy} />
      </Card>
    </>
  );
}
