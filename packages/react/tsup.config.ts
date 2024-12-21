import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    'react.server': 'src/server.ts',
    'react.client': 'src/client.ts',
    vite: 'src/vite.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
