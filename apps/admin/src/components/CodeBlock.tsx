import { Button, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { codeTokens } from './code';

export function CodeBlock({
  text,
  label = '接入示例',
  onCopy,
  maxHeight,
}: {
  text: string;
  label?: string;
  onCopy?: (text: string) => Promise<void>;
  maxHeight?: number;
}) {
  return (
    <div className="code-block">
      <div className="code-toolbar">
        <Typography.Text type="secondary">{label}</Typography.Text>
        {onCopy && (
          <Button
            size="small"
            aria-label="复制代码"
            icon={<CopyOutlined aria-hidden />}
            onClick={() => void onCopy(text)}
          >
            复制
          </Button>
        )}
      </div>
      <pre style={{ maxHeight }}>
        <code>
          {codeTokens(text).map((part, index) =>
            part.kind ? (
              <span key={index} className={'syntax-' + part.kind}>
                {part.text}
              </span>
            ) : (
              part.text
            ),
          )}
        </code>
      </pre>
    </div>
  );
}
