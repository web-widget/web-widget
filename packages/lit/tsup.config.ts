import { defineConfig } from 'tsup';
export default defineConfig({
  dts: true,
  entry: {
    lit: 'src/index.ts',
    'lit.adapter.server': 'src/adapter.server.ts',
    'lit.adapter.client': 'src/adapter.client.ts',
  },
  format: 'esm',
  outDir: 'dist',
  splitting: true,
  target: 'chrome67',
});
