import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    vite: 'src/index.ts',
    'vitest-node-environment': 'src/helpers/vitest-node-environment.ts',
    'vitest-edge-runtime-environment':
      'src/helpers/vitest-edge-runtime-environment.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
