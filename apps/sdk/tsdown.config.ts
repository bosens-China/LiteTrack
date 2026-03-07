import { defineConfig } from 'tsdown';

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
});
