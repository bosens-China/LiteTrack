import {
  Alert,
  Button,
  Collapse,
  Skeleton,
  Space,
  Tabs,
  Tooltip,
  Typography,
  Tag,
} from 'antd';
import { CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { QueryError } from './QueryError';
import { CodeBlock } from './CodeBlock';
import { getNpmRelease } from '../sdkRelease';

declare const __SDK_VERSION__: string;
declare const __SDK_RELEASED__: boolean;
declare const __SDK_INTEGRITY__: string;
const filenames = ['index.mjs', 'index.d.mts'] as const;
const base = '/sdk/' + __SDK_VERSION__ + '/';

export function SdkAccess({
  token,
  onCopy,
}: {
  token?: string;
  onCopy: (text: string) => Promise<void>;
}) {
  const files = useQuery({
    queryKey: ['sdk-files', __SDK_VERSION__],
    queryFn: ({ signal }) =>
      Promise.all(
        filenames.map(async (name) => {
          const response = await fetch(base + name, { signal });
          if (!response.ok)
            throw new Error('SDK 文件加载失败：' + response.status);
          return { name, content: await response.text() };
        }),
      ),
  });
  const npm = useQuery({
    queryKey: ['npm-release', __SDK_VERSION__],
    queryFn: ({ signal }) =>
      getNpmRelease(__SDK_RELEASED__ ? __SDK_VERSION__ : undefined, signal),
    staleTime: 60000,
  });
  const code = (text: string, label?: string) => (
    <CodeBlock text={text} label={label} onCopy={onCopy} />
  );
  const options = JSON.stringify(
    { baseUrl: window.location.origin, siteToken: token || 'YOUR_API_KEY' },
    null,
    2,
  );
  const example = (source: string) =>
    `import { create } from '${source}';\n\nconst tracker = create(${options});\ntracker.page();`;
  const script = `<script src="${window.location.origin}${base}litetrack.min.js"${__SDK_INTEGRITY__ ? ` integrity="${__SDK_INTEGRITY__}" crossorigin="anonymous"` : ''}></script>\n<script>\n  const tracker = LiteTrack.create(${options});\n  tracker.page();\n</script>`;
  return (
    <section className="data-section">
      <div className="section-heading">
        <h2>SDK 接入</h2>
        <span className="muted">
          <Tag color={__SDK_RELEASED__ ? 'blue' : 'default'}>
            {__SDK_RELEASED__ ? 'SDK ' + __SDK_VERSION__ : '当前构建：开发预览'}
          </Tag>
        </span>
      </div>
      <Typography.Paragraph type="secondary">
        选择接入方式，复制示例到项目中。首次打开页面及完成路由切换后调用
        tracker.page()。
      </Typography.Paragraph>
      <Tabs
        defaultActiveKey="files"
        items={[
          {
            key: 'files',
            label: '本地文件',
            children: (
              <>
                <Typography.Paragraph type="secondary">
                  下载以下两个文件到同一目录，再从 index.mjs 导入。
                </Typography.Paragraph>
                <QueryError
                  error={files.error}
                  retry={() => void files.refetch()}
                />
                {files.isPending ? (
                  <Skeleton active paragraph={{ rows: 1 }} />
                ) : (
                  files.data && (
                    <div className="sdk-files">
                      {files.data.map((file) => (
                        <div key={file.name} className="sdk-file">
                          <Typography.Text strong>{file.name}</Typography.Text>
                          <Space>
                            <Tooltip title={'复制 ' + file.name}>
                              <Button
                                aria-label={'复制 ' + file.name}
                                icon={<CopyOutlined aria-hidden />}
                                onClick={() => void onCopy(file.content)}
                              />
                            </Tooltip>
                            <Tooltip title={'下载 ' + file.name}>
                              <Button
                                aria-label={'下载 ' + file.name}
                                href={base + file.name}
                                download={file.name}
                                icon={<DownloadOutlined aria-hidden />}
                              />
                            </Tooltip>
                          </Space>
                        </div>
                      ))}
                    </div>
                  )
                )}
                {code(example('./index.mjs'))}
                {files.data && (
                  // 源码篇幅较长，默认折叠，需要核对时再展开
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'source',
                        label: '查看文件源码',
                        children: files.data.map((file) => (
                          <CodeBlock
                            key={file.name}
                            text={file.content}
                            label={file.name}
                            maxHeight={320}
                          />
                        )),
                      },
                    ]}
                  />
                )}
              </>
            ),
          },
          { key: 'script', label: 'Script', children: code(script) },
          {
            key: 'skills',
            label: 'AI Skills',
            children: code(
              'npx skills add bosens-China/LiteTrack --skill integrate-litetrack',
            ),
          },
          {
            key: 'npm',
            label: 'npm',
            children: (
              <>
                <QueryError
                  error={npm.error}
                  retry={() => void npm.refetch()}
                />
                {npm.isPending ? (
                  <Skeleton active paragraph={{ rows: 1 }} />
                ) : (
                  npm.data && (
                    <>
                      <Alert
                        showIcon
                        type={npm.data.currentPublished ? 'success' : 'info'}
                        title={'npm 最新已发布版本：' + npm.data.latest}
                        description={
                          npm.data.currentPublished
                            ? '当前 SDK 已发布，可使用下方命令安装。'
                            : __SDK_RELEASED__
                              ? '当前 SDK 的静态产物已就绪，npm 包尚未发布。请先使用本地文件或 Script。'
                              : '当前构建是新采集协议的开发预览。npm 版本不能据此视为兼容，请先使用本地文件或 Script 接入当前服务。'
                        }
                      />
                      {npm.data.currentPublished && (
                        <>
                          {code(
                            'pnpm add @boses/litetrack-sdk@' + __SDK_VERSION__,
                            '安装 SDK',
                          )}
                          {code(example('@boses/litetrack-sdk'))}
                        </>
                      )}
                    </>
                  )
                )}
              </>
            ),
          },
        ]}
      />
    </section>
  );
}
