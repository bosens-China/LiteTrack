import type { FastifyRequest } from 'fastify';

/** OAuth code/state 位于 URL，Axios 配置可能包含密钥和访问令牌，均不进入日志。 */
export const safeLoggingOptions = {
  serializers: {
    req(request: FastifyRequest) {
      return {
        method: request.method,
        url: request.url.split('?')[0],
        remoteAddress: request.ip,
      };
    },
  },
  redact: {
    paths: [
      'err.config',
      'err.request',
      'err.response',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-site-token"]',
      'token',
      'access_token',
      'client_secret',
    ],
    remove: true,
  },
};
