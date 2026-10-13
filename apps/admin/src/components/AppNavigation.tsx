import { Link, useLocation } from 'react-router';
import { Menu } from 'antd';
import {
  BookOutlined,
  FolderOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { analyticsUrl, navigationKey, projectId } from '../navigation';

export function AppNavigation({ onNavigate }: { onNavigate: () => void }) {
  const { pathname, search } = useLocation();
  const selected = navigationKey(pathname);
  const id = projectId(
    pathname.match(/^\/sites\/([^/]+)\/settings$/)?.[1] ||
      new URLSearchParams(search).get('project'),
  );
  return (
    <Menu
      key={pathname}
      mode="inline"
      aria-label="主导航"
      // 侧栏容器已有分隔线，避免与 inline Menu 自带的右边框叠成双线
      style={{ borderInlineEnd: 'none' }}
      selectedKeys={selected ? [selected] : []}
      defaultOpenKeys={pathname.startsWith('/sites') ? ['projects'] : []}
      onClick={onNavigate}
      items={[
        {
          key: '/',
          icon: <LineChartOutlined aria-hidden />,
          label: <Link to={analyticsUrl(id)}>数据总览</Link>,
        },
        {
          key: 'projects',
          icon: <FolderOutlined aria-hidden />,
          label: '项目管理',
          children: [
            { key: '/sites', label: <Link to="/sites">项目列表</Link> },
            {
              key: '/sites/settings',
              label: (
                <Link
                  to={id ? '/sites/' + id + '/settings' : '/sites/settings'}
                >
                  项目设置
                </Link>
              ),
            },
          ],
        },
        {
          key: '/integration',
          icon: <BookOutlined aria-hidden />,
          label: (
            <Link to={id ? '/integration?project=' + id : '/integration'}>
              接入指南
            </Link>
          ),
        },
      ]}
    />
  );
}
