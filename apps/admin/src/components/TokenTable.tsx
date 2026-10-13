import {
  Button,
  Grid,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tooltip,
  Typography,
} from 'antd';
import type { TableColumnsType } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { SiteToken } from '@litetrack/contracts';

export function TokenTable({
  tokens,
  loading,
  togglingId,
  removingId,
  onToggle,
  onRemove,
}: {
  tokens?: SiteToken[];
  loading: boolean;
  /** 正在切换启用状态的 Key；存在时禁用其他行的开关与删除，避免并发修改 */
  togglingId?: number;
  removingId?: number;
  onToggle: (tokenId: number, active: boolean) => void;
  onRemove: (tokenId: number) => Promise<unknown>;
}) {
  // 断点首帧尚未计算时为 undefined，默认按桌面布局，避免桌面端闪现窄屏列
  const compact = Grid.useBreakpoint().md === false;
  const busy = togglingId !== undefined;
  const key = (token: SiteToken) => (
    <Typography.Paragraph
      className="api-key"
      code
      copyable={{ text: token.token, tooltips: ['复制 API Key', '已复制'] }}
      style={{ margin: 0 }}
    >
      {token.token}
    </Typography.Paragraph>
  );
  const toggle = (token: SiteToken) => (
    <Switch
      aria-label={'启用 ' + token.name}
      checked={token.isActive}
      disabled={busy}
      loading={togglingId === token.id}
      onChange={(active) => onToggle(token.id, active)}
    />
  );
  const remove = (token: SiteToken) => (
    <Popconfirm
      title="删除此 API Key？"
      description="使用它的项目将无法继续上报。"
      okText="删除"
      cancelText="取消"
      onConfirm={() => onRemove(token.id)}
    >
      <Tooltip title="删除 API Key">
        <Button
          danger
          type="text"
          disabled={busy}
          aria-label={'删除 ' + token.name}
          loading={removingId === token.id}
          icon={<DeleteOutlined aria-hidden />}
        />
      </Tooltip>
    </Popconfirm>
  );
  // 窄屏把名称、开关、删除放在同一行，Key 单独换行，避免操作列被横向滚动隐藏
  const columns: TableColumnsType<SiteToken> = !compact
    ? [
        { title: '名称', dataIndex: 'name', width: 160 },
        { title: 'API Key', render: (_, token) => key(token) },
        { title: '启用', width: 90, render: (_, token) => toggle(token) },
        { title: '', width: 60, render: (_, token) => remove(token) },
      ]
    : [
        {
          title: 'API Key',
          render: (_, token) => (
            <div className="token-cell">
              <div className="token-cell-header">
                <Typography.Text strong>{token.name}</Typography.Text>
                <Space>
                  {toggle(token)}
                  {remove(token)}
                </Space>
              </div>
              {key(token)}
            </div>
          ),
        },
      ];
  return (
    <Table<SiteToken>
      rowKey="id"
      dataSource={tokens}
      loading={loading}
      pagination={false}
      scroll={compact ? undefined : { x: 540 }}
      columns={columns}
    />
  );
}
