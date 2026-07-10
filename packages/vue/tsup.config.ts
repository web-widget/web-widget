import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    vue: 'src/index.ts',
    'vue.server': 'src/server.ts',
    'vue.client': 'src/client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
