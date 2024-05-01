import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    'lifecycle-cache.universal.server': 'src/universal.server.ts',
    'lifecycle-cache.universal.client': 'src/universal.client.ts',
    'lifecycle-cache.server': 'src/server.ts',
    'lifecycle-cache.client': 'src/client.ts',
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
