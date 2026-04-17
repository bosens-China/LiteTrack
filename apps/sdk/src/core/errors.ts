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
  if (debug && typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error('[LiteTrack]', error);
  }

  onError?.(error);
}
