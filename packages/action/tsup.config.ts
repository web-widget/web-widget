import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    action: 'src/index.ts',
    'action.server': 'src/server.ts',
    'action.client': 'src/client.ts',
  },
  dts: true,
  target: 'es2020',
  splitting: true,
  sourcemap: false,
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: [],
};
