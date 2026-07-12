import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    vue: 'src/index.ts',
    'vue.adapter.server': 'src/adapter.server.ts',
    'vue.adapter.client': 'src/adapter.client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
