import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    html: 'src/index.ts',
    'html.runtime': 'src/runtime.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
