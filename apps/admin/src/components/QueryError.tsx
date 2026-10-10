import { Alert, Button } from 'antd';
export function QueryError({
  error,
  retry,
}: {
  error: Error | null;
  retry: () => void;
}) {
  return error ? (
    <Alert
      type="error"
      showIcon
      title={error.message}
      action={
        <Button size="small" onClick={retry}>
          重试
        </Button>
      }
    />
  ) : null;
}
