import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    index: 'src/index.ts',
    'vue2.client': 'src/client.ts',
    'vue2.server': 'src/server.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
