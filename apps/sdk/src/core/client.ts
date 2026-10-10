import { normalizePath } from '@litetrack/contracts/path';
import type { CollectInput } from '@litetrack/contracts';
import { createLiteTrackError, reportLiteTrackError } from './errors';
import { createId, visitorId } from './identity';
import { PROTOCOL_VERSION, SDK_VERSION } from './version';
import type { LiteTrackCreateOptions, LiteTrackError, Tracker } from './types';

export function create(options: LiteTrackCreateOptions): Tracker {
  let endpoint: string;
  try {
    const base = new URL(options.baseUrl);
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      throw new Error('baseUrl 必须是 HTTP 地址');
    if (!/^[a-f0-9]{64}$/.test(options.siteToken))
      throw new Error('siteToken 必须是 64 位十六进制字符串');
    if (
      options.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)
    )
      throw new Error('timeoutMs 必须是正整数');
    endpoint = options.baseUrl.replace(/\/+$/, '') + '/litetrack/collect';
  } catch (cause) {
    throw createLiteTrackError({
      code: 'INVALID_OPTIONS',
      message: 'LiteTrack 初始化参数无效',
      cause,
    });
  }
  let destroyed = false;
  let currentPath: string | undefined;
  const report = (error: LiteTrackError) =>
    reportLiteTrackError({
      error,
      debug: options.debug,
      onError: options.onError,
    });
  async function send(payload: Omit<CollectInput, 'visitorId'>) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 10000,
    );
    try {
      const identity = await visitorId(options.siteToken);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Token': options.siteToken,
          'X-LiteTrack-SDK': SDK_VERSION,
        },
        body: JSON.stringify({ ...payload, visitorId: identity }),
        keepalive: true,
        signal: controller.signal,
      });
      if (!response.ok)
        report(
          createLiteTrackError({
            code: 'HTTP_ERROR',
            status: response.status,
            message: 'LiteTrack 上报失败：' + response.status,
          }),
        );
    } catch (cause) {
      report(
        createLiteTrackError({
          code: controller.signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
          message: 'LiteTrack 上报未完成',
          cause,
        }),
      );
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    page(input) {
      if (
        destroyed ||
        typeof window === 'undefined' ||
        typeof document === 'undefined'
      )
        return;
      try {
        if (
          typeof fetch === 'undefined' ||
          typeof AbortController === 'undefined'
        ) {
          report(
            createLiteTrackError({
              code: 'ENVIRONMENT_ERROR',
              message: '当前浏览器需要 fetch 和 AbortController',
            }),
          );
          return;
        }
        const rawPath = input?.path ?? window.location.pathname;
        if (typeof rawPath !== 'string' || rawPath.length > 500)
          throw new Error('path 无效');
        const path = normalizePath(rawPath);
        if (currentPath === path && !input?.newVisit) return;
        const title = input?.title ?? document.title;
        if (typeof title !== 'string') throw new Error('title 无效');
        const payload: Omit<CollectInput, 'visitorId'> = {
          protocolVersion: PROTOCOL_VERSION,
          eventId: createId(),
          path,
          title: title.slice(0, 500),
          referrer: document.referrer.slice(0, 2048),
        };
        currentPath = path;
        void send(payload);
      } catch (cause) {
        report(
          createLiteTrackError({
            code: 'INVALID_OPTIONS',
            message: 'LiteTrack 页面参数无效',
            cause,
          }),
        );
      }
    },
    destroy() {
      destroyed = true;
      currentPath = undefined;
    },
  };
}
