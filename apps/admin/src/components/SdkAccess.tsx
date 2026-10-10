import { useState } from 'react';
import { Alert, Button, Select, Skeleton, Space, Tabs, Tooltip } from 'antd';
import { Copy, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { SiteToken } from '@litetrack/contracts';
import { QueryError } from './QueryError';

declare const __SDK_VERSION__: string;
declare const __SDK_RELEASED__: boolean;
declare const __SDK_INTEGRITY__: string;
const filenames = ['index.mjs', 'index.d.mts'] as const;
const base = '/sdk/' + __SDK_VERSION__ + '/';

export function SdkAccess({
  tokens,
  onCopy,
}: {
  tokens: SiteToken[];
  onCopy: (text: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState('');
  const active = tokens.filter((token) => token.isActive);
  const token =
    active.find((item) => item.token === selected)?.token || active[0]?.token;
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
  const code = (text: string) => (
    <div className="code-block">
      <Tooltip title="复制代码">
        <Button
          aria-label="复制代码"
          icon={<Copy size={15} />}
          onClick={() => void onCopy(text)}
        />
      </Tooltip>
      <pre style={{ marginRight: 52, paddingRight: 12 }}>{text}</pre>
    </div>
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
          SDK {__SDK_RELEASED__ ? __SDK_VERSION__ : '开发预览'}
        </span>
      </div>
      <Select
        aria-label="接入 API Key"
        placeholder="暂无启用的 API Key"
        value={token}
        disabled={!active.length}
        options={active.map((item) => ({
          label: item.name,
          value: item.token,
        }))}
        onChange={setSelected}
        style={{ width: '100%', maxWidth: 320, marginBottom: 12 }}
      />
      <Tabs
        defaultActiveKey="files"
        items={[
          {
            key: 'files',
            label: '本地文件',
            children: (
              <>
                <QueryError
                  error={files.error}
                  retry={() => void files.refetch()}
                />
                {files.isPending ? (
                  <Skeleton active />
                ) : (
                  files.data?.map((file) => (
                    <div key={file.name}>
                      <div className="section-heading">
                        <strong>{file.name}</strong>
                        <Space>
                          <Tooltip title={'复制 ' + file.name}>
                            <Button
                              aria-label={'复制 ' + file.name}
                              icon={<Copy size={15} />}
                              onClick={() => void onCopy(file.content)}
                            />
                          </Tooltip>
                          <Tooltip title={'下载 ' + file.name}>
                            <Button
                              aria-label={'下载 ' + file.name}
                              href={base + file.name}
                              download={file.name}
                              icon={<Download size={15} />}
                            />
                          </Tooltip>
                        </Space>
                      </div>
                      <div className="code-block">
                        <pre style={{ maxHeight: 220 }}>{file.content}</pre>
                      </div>
                    </div>
                  ))
                )}
                {code(example('./index.mjs'))}
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
                {__SDK_RELEASED__ ? (
                  code('pnpm add @boses/litetrack-sdk@' + __SDK_VERSION__)
                ) : (
                  <Alert
                    type="warning"
                    title="当前 SDK 尚未正式发布，请勿安装旧版 npm 包。"
                  />
                )}
                {code(example('@boses/litetrack-sdk'))}
              </>
            ),
          },
        ]}
      />
    </section>
  );
}
