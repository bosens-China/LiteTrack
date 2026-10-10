declare const __SDK_VERSION__: string | undefined;
export const SDK_VERSION =
  typeof __SDK_VERSION__ === 'undefined' ? 'development' : __SDK_VERSION__;
export { PROTOCOL_VERSION } from '@litetrack/contracts/protocol';
