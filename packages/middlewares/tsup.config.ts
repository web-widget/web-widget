import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    cache: 'src/cache.ts',
    'conditional-get': 'src/conditional-get.ts',
    etag: 'src/etag.ts',
    index: 'src/index.ts',
    'inline-styles': 'src/inline-styles.ts',
    'powered-by': 'src/powered-by.ts',
    timing: 'src/timing.ts',
    'trailing-slash': 'src/trailing-slash.ts',
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
