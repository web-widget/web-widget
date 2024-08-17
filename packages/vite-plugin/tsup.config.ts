import type { Options } from 'tsup';
export const tsup: Options = {
  entry: {
    vite: 'src/index.ts',
    'vitest-node-environment': 'src/helpers/vitest-node-environment.ts',
    'vitest-edge-runtime-environment':
      'src/helpers/vitest-edge-runtime-environment.ts',
  },
  dts: true,
  target: 'node18',
  splitting: true,
  sourcemap: false,
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  external: [],
};
