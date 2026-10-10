import { lazy, Suspense } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import {
  App as AntApp,
  Avatar,
  Button,
  Popconfirm,
  Result,
  Skeleton,
  Tooltip,
} from 'antd';
import { ChartNoAxesCombined, Github, LogOut } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, getUser, logout } from './api';

const Sites = lazy(() => import('./pages/Sites'));
const SiteDetail = lazy(() => import('./pages/SiteDetail'));
const Settings = lazy(() => import('./pages/Settings'));
export default function App() {
  const client = useQueryClient();
  const { message } = AntApp.useApp();
  const location = useLocation();
  const user = useQuery({
    queryKey: ['user'],
    queryFn: ({ signal }) => getUser(signal),
    retry: false,
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
        <span className="muted">网站访问统计</span>
        <Button
          type="primary"
          size="large"
          href="/litetrack/api/auth/github"
          icon={<Github size={18} />}
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
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span>LiteTrack</span>
        </Link>
        <nav>
          <Link
            to="/"
            className={
              location.pathname === '/' ? 'nav-link active' : 'nav-link'
            }
          >
            <ChartNoAxesCombined size={18} />
            我的项目
          </Link>
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          自托管统计
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="topbar-title">网站统计</span>
          <div className="account">
            <Avatar size={28} src={user.data?.avatar}>
              {user.data?.username.slice(0, 1)}
            </Avatar>
            <span>{user.data?.username}</span>
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
                  icon={<LogOut size={16} />}
                  loading={leave.isPending}
                />
              </Tooltip>
            </Popconfirm>
          </div>
        </header>
        <main className="main-content">
          <Suspense fallback={<Skeleton active />}>
            <Routes>
              <Route path="/" element={<Sites />} />
              <Route path="/sites/:id" element={<SiteDetail />} />
              <Route path="/sites/:id/settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <Result
                    status="404"
                    title="页面不存在"
                    extra={<Link to="/">返回项目列表</Link>}
                  />
                }
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
