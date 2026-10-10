import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { PROTOCOL_VERSION } from '@litetrack/contracts/protocol';

const sdk = JSON.parse(
  readFileSync(new URL('../sdk/package.json', import.meta.url), 'utf8'),
) as { version: string };
const currentFile = new URL('./public/sdk/current.json', import.meta.url);
const current = existsSync(currentFile)
  ? (JSON.parse(readFileSync(currentFile, 'utf8')) as {
      version: string;
      protocolVersion: number;
      integrity: string;
    })
  : undefined;
const released =
  current?.version === sdk.version &&
  current.protocolVersion === PROTOCOL_VERSION;
export default defineConfig({
  plugins: [pluginReact({ reactCompiler: true })],
  source: {
    define: {
      __SDK_VERSION__: JSON.stringify(released ? sdk.version : 'preview'),
      __SDK_RELEASED__: JSON.stringify(released),
      __SDK_INTEGRITY__: JSON.stringify(released ? current.integrity : ''),
    },
  },
  server: {
    proxy: {
      '/litetrack': {
        target: process.env.API_UPSTREAM || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  html: { title: 'LiteTrack', favicon: './public/favicon.svg' },
});
