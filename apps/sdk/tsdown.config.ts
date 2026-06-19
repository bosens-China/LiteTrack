import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

// 读取 package.json 的版本号，作为版本契约的单一来源。
// 一处修改版本号，IIFE 内嵌版本、请求的 API 前缀、上报头会全部自动对齐。
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };

export default defineConfig({
  // 入口文件
  entry: ['./src/index.ts'],

  // 输出目录
  outDir: './dist',

  // 仅输出 IIFE 单文件，供 script 标签引入
  format: ['iife'],
  dts: false,
  // splitting: false,

  // 清理输出目录
  clean: true,

  // 压缩
  minify: true,

  // 添加 banner
  // banner: '/*! LiteTrack SDK | MIT License */',

  // 仅使用命名导出
  // exports: 'named',

  // IIFE 全局变量名
  globalName: 'LiteTrack',

  // 构建时把版本号注入为全局常量（见 src/core/version.ts）
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
});
