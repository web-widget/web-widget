import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    'html.server': 'src/server.ts',
    'html.client': 'src/client.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
