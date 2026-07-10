import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    index: 'src/index.ts',
    'html.server': 'src/server.ts',
    'runtime.server': 'src/runtime.server.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
