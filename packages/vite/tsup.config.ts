import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    vite: 'src/index.ts',
  },
  dts: true,
  target: 'node18',
  splitting: true,
  sourcemap: false,
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  external: [],
};
