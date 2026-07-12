import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    react: 'src/index.ts',
    'react.adapter.server': 'src/adapter.server.ts',
    'react.adapter.client': 'src/adapter.client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
