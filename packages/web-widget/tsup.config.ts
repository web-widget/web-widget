import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'web-widget.server': 'src/server.ts',
    'web-widget.client': 'src/client.ts',
    inspector: 'src/inspector.ts',
  },
  dts: true,
  target: ['es2017', 'chrome67'],
  splitting: false,
  sourcemap: true,
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: [],
};
