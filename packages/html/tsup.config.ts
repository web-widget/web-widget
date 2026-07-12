import { defineConfig } from 'tsup';

export default defineConfig({
  dts: true,
  entry: {
    html: 'src/index.ts',
    'html.adapter': 'src/adapter.ts',
    'html.vite-plugin': 'src/vite-plugin.ts',
  },
  external: [],
  format: 'esm',
  outDir: 'dist',
  sourcemap: false,
  splitting: true,
  target: 'chrome67',
});
