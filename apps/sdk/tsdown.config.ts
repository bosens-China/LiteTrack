import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

// 版本号从 package.json 读取，是唯一来源：
// IIFE 内嵌版本、ESM 版本、请求的 API 前缀、上报头全部自动对齐。
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };

const define = {
  __SDK_VERSION__: JSON.stringify(pkg.version),
};

export default defineConfig([
  {
    // IIFE：供 <script> 标签引入，暴露为 window.LiteTrack，压缩
    entry: ['./src/index.ts'],
    outDir: './dist',
    format: ['iife'],
    globalName: 'LiteTrack',
    minify: true,
    dts: false,
    clean: true,
    define,
  },
  {
    // ESM：供 npm 用户在打包工具（Vite、webpack 等）中 import，附带类型声明
    entry: ['./src/index.ts'],
    outDir: './dist',
    format: ['esm'],
    dts: true,
    define,
  },
]);
