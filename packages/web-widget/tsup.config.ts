import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    'web-widget.server': 'src/server.ts',
    'web-widget.client': 'src/client.ts',
    inspector: 'src/inspector.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: false,
  target: 'chrome67',
});
