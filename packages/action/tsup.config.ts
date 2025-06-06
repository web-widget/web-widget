import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    action: 'src/index.ts',
    'action.server': 'src/server.ts',
    'action.client': 'src/client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
