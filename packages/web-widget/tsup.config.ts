import { defineConfig } from 'tsup';
export default defineConfig({
  entry: {
    'web-widget.server': 'src/server.ts',
    'web-widget.client': 'src/client.ts',
    inspector: 'src/inspector.ts',
  },
  dts: true,
  target: ['es2017', 'chrome67'],
  splitting: true,
  sourcemap: true,
  format: ['esm'],
  outDir: 'dist',
  external: [],
});
