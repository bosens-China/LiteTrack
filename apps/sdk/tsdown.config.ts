import { defineConfig } from 'tsdown'

export default defineConfig({
  // 入口文件
  entry: ['./src/index.ts'],
  
  // 输出目录
  outDir: './dist',
  
  // 生成多种格式
  format: ['esm', 'cjs'],
  
  // 生成类型声明
  dts: true,
  
  // 代码分割
  splitting: true,
  
  // 清理输出目录
  clean: true,
  
  // 压缩
  minify: true,
  
  // 添加 banner
  banner: '/*! LiteTrack SDK | MIT License */',
  
  // 仅使用命名导出
  exports: 'named',
})
