import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    vue2: 'src/index.ts',
    'vue2.adapter.client': 'src/adapter.client.ts',
    'vue2.adapter.server': 'src/adapter.server.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
