import { defineConfig } from 'tsup';
export default defineConfig({
  dts: true,
  entry: {
    preact: 'src/index.ts',
    'preact.transform': 'src/transform.ts',
    'preact.adapter.server': 'src/adapter.server.ts',
    'preact.adapter.client': 'src/adapter.client.ts',
  },
  format: 'esm',
  outDir: 'dist',
  splitting: true,
  target: 'chrome67',
});
