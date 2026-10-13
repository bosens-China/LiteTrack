import { lazy, Suspense, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import {
  App as AntApp,
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Grid,
  Layout,
  Popconfirm,
  Result,
  Skeleton,
  Space,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  GithubOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, getSite, getUser, logout } from './api';
import { AppNavigation } from './components/AppNavigation';
import { navigationKey, projectId } from './navigation';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sites = lazy(() => import('./pages/Sites'));
const SiteDetail = lazy(() => import('./pages/SiteDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const Integration = lazy(() => import('./pages/Integration'));
export default function App() {
  const client = useQueryClient();
  const { message } = AntApp.useApp();
  const { token } = theme.useToken();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const user = useQuery({
    queryKey: ['user'],
    queryFn: ({ signal }) => getUser(signal),
    retry: false,
  });
  const selectedKey = navigationKey(location.pathname);
  const selectedProjectId = projectId(
    location.pathname.match(/^\/sites\/([^/]+)\/settings$/)?.[1] ||
      new URLSearchParams(location.search).get('project'),
  );
  const selectedProject = useQuery({
    queryKey: ['site', selectedProjectId],
    queryFn: ({ signal }) => getSite(selectedProjectId!, signal),
    enabled: user.isSuccess && selectedProjectId !== undefined,
  });
  const leave = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      client.clear();
      window.location.assign('/');
    },
    onError: (error) => message.error(error.message),
  });
  if (user.isPending)
    return (
      <div className="initial-loading">
        <Skeleton active />
      </div>
    );
  if (user.error instanceof ApiError && user.error.status === 401)
    return (
      <main className="login">
        <img src="/favicon.svg" alt="" width="48" height="48" />
        <h1>LiteTrack</h1>
        <Typography.Text type="secondary">网站访问统计</Typography.Text>
        <Button
          type="primary"
          size="large"
          href="/litetrack/api/auth/github"
          icon={<GithubOutlined aria-hidden />}
        >
          使用 GitHub 登录
        </Button>
      </main>
    );
  if (user.error)
    return (
      <Result
        status="error"
        title="暂时无法连接"
        subTitle={user.error.message}
        extra={<Button onClick={() => void user.refetch()}>重试</Button>}
      />
    );
  const navigation = (
    <AppNavigation onNavigate={() => setNavigationOpen(false)} />
  );
  const currentPage =
    selectedKey === '/'
      ? '数据总览'
      : selectedKey === '/integration'
        ? '接入指南'
        : selectedKey === '/sites'
          ? '项目列表'
          : selectedKey === '/sites/settings'
            ? '项目设置'
            : '页面不存在';
  const projectTitle = selectedProject.data?.title;
  const breadcrumb = [
    ...(screens.md ? [{ title: <Link to="/">LiteTrack</Link> }] : []),
    ...(selectedKey?.startsWith('/sites')
      ? [{ title: <Link to="/sites">项目管理</Link> }]
      : []),
    { title: currentPage },
    ...(projectTitle
      ? [
          {
            title: (
              <Typography.Text
                ellipsis
                style={{ maxWidth: screens.md ? 240 : 120 }}
                title={projectTitle}
              >
                {projectTitle}
              </Typography.Text>
            ),
          },
        ]
      : []),
  ];
  return (
    <Layout className="app-shell">
      {screens.lg && (
        <Layout.Sider width={216} theme="light" className="sidebar">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <Typography.Text strong>LiteTrack</Typography.Text>
          </Link>
          <nav aria-label="主导航">{navigation}</nav>
        </Layout.Sider>
      )}
      <Drawer
        title="LiteTrack"
        placement="left"
        size={260}
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
        styles={{ body: { padding: 0 } }}
      >
        {navigation}
      </Drawer>
      <Layout style={{ minWidth: 0 }}>
        <Layout.Header
          className="topbar"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            paddingInline: screens.md ? 24 : 16,
          }}
        >
          <Space style={{ minWidth: 0, flex: 1 }}>
            {!screens.lg && (
              <Button
                type="text"
                aria-label="打开导航"
                icon={<MenuOutlined aria-hidden />}
                onClick={() => setNavigationOpen(true)}
              />
            )}
            <Breadcrumb items={breadcrumb} />
          </Space>
          <Space>
            <Avatar size={28} src={user.data?.avatar}>
              {user.data?.username.slice(0, 1)}
            </Avatar>
            {screens.md && (
              <Typography.Text>{user.data?.username}</Typography.Text>
            )}
            <Popconfirm
              title="退出登录？"
              okText="退出"
              cancelText="取消"
              onConfirm={() => leave.mutateAsync()}
            >
              <Tooltip title="退出登录">
                <Button
                  type="text"
                  aria-label="退出登录"
                  icon={<LogoutOutlined aria-hidden />}
                  loading={leave.isPending}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        </Layout.Header>
        <Layout.Content className="main-content">
          <Suspense fallback={<Skeleton active />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sites" element={<Sites />} />
              <Route path="/integration" element={<Integration />} />
              <Route path="/sites/settings" element={<Settings />} />
              <Route path="/sites/:id" element={<SiteDetail />} />
              <Route path="/sites/:id/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <Result
                    status="404"
                    title="页面不存在"
                    extra={<Link to="/sites">返回项目列表</Link>}
                  />
                }
              />
            </Routes>
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
