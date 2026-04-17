import { buildApiUrl } from './env';
import { createLiteTrackError, reportLiteTrackError } from './errors';
import type { LiteTrackError } from './types';

interface TransportOptions {
  baseUrl: string;
  debug?: boolean;
  onError?: (error: LiteTrackError) => void;
  siteToken: string;
}

interface JsonRecord {
  [key: string]: string | number | undefined;
}

export interface Transport {
  get<T>(endpoint: string, query?: Record<string, string>): Promise<T>;
  post(endpoint: string, payload: JsonRecord): void;
}

export function createTransport(options: TransportOptions): Transport {
  const handleError = (error: LiteTrackError): void => {
    reportLiteTrackError({
      error,
      debug: options.debug,
      onError: options.onError,
    });
  };

  return {
    async get<T>(endpoint: string, query?: Record<string, string>) {
      if (typeof fetch === 'undefined') {
        throw createLiteTrackError({
          message: '当前环境不支持 fetch，无法执行 LiteTrack 查询请求',
          code: 'ENVIRONMENT_ERROR',
          context: { endpoint },
        });
      }

      const url = buildApiUrl(options.baseUrl, endpoint, query);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Site-Token': options.siteToken,
          },
        });
      } catch (cause) {
        const error = createLiteTrackError({
          message: 'LiteTrack 查询请求失败',
          code: 'NETWORK_ERROR',
          cause,
          context: { endpoint, url },
        });
        handleError(error);
        throw error;
      }

      if (!response.ok) {
        const error = createLiteTrackError({
          message: `LiteTrack 查询请求返回异常状态码 ${response.status}`,
          code: 'HTTP_ERROR',
          status: response.status,
          context: { endpoint, url },
        });
        handleError(error);
        throw error;
      }

      try {
        return (await response.json()) as T;
      } catch (cause) {
        const error = createLiteTrackError({
          message: 'LiteTrack 查询响应不是有效的 JSON',
          code: 'INVALID_RESPONSE',
          cause,
          context: { endpoint, url },
        });
        handleError(error);
        throw error;
      }
    },
    post(endpoint: string, payload: JsonRecord) {
      if (typeof fetch === 'undefined') {
        handleError(
          createLiteTrackError({
            message: '当前环境不支持 fetch，无法执行 LiteTrack 上报请求',
            code: 'ENVIRONMENT_ERROR',
            context: { endpoint },
          }),
        );
        return;
      }

      const url = buildApiUrl(options.baseUrl, endpoint);

      void fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Token': options.siteToken,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((response) => {
          if (response.ok) {
            return;
          }

          handleError(
            createLiteTrackError({
              message: `LiteTrack 上报请求返回异常状态码 ${response.status}`,
              code: 'HTTP_ERROR',
              status: response.status,
              context: { endpoint, url },
            }),
          );
        })
        .catch((cause) => {
          handleError(
            createLiteTrackError({
              message: 'LiteTrack 上报请求失败',
              code: 'NETWORK_ERROR',
              cause,
              context: { endpoint, url },
            }),
          );
        });
    },
  };
}
