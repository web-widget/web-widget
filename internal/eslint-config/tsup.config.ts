import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    index: 'src/index.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
