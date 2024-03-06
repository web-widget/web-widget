import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    cache: 'src/cache.ts',
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
