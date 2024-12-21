import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
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
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
