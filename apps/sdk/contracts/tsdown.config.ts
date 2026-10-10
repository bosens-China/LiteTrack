import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts', 'src/path.ts', 'src/protocol.ts'],
  format: 'esm',
  dts: true,
  clean: false,
});
