import type { LiteTrackError, LiteTrackErrorCode } from './types';

interface CreateLiteTrackErrorInput {
  message: string;
  code: LiteTrackErrorCode;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
}

interface ReportLiteTrackErrorInput {
  error: LiteTrackError;
  debug?: boolean;
  onError?: (error: LiteTrackError) => void;
}

export function createLiteTrackError({
  message,
  code,
  status,
  cause,
  context,
}: CreateLiteTrackErrorInput): LiteTrackError {
  const error = new Error(message) as LiteTrackError;
  error.name = 'LiteTrackError';
  error.code = code;
  error.status = status;
  error.cause = cause;
  error.context = context;
  return error;
}

export function reportLiteTrackError({
  error,
  debug,
  onError,
}: ReportLiteTrackErrorInput): void {
  try {
    if (
      debug &&
      typeof console !== 'undefined' &&
      typeof console.error === 'function'
    ) {
      console.error('[LiteTrack]', error);
    }
  } catch {
    // 调试输出失败不能阻止业务接收错误。
  }
  try {
    const result: unknown = onError?.(error);
    // void 回调也允许调用方传入 async 函数，隔离其异步拒绝。
    if (result) void Promise.resolve(result).catch(() => {});
  } catch {
    // 用户回调不能影响宿主，也不能被重新归类为网络失败。
  }
}
