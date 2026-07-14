import { defineConfig } from 'tsup';
export default defineConfig({
  dts: true,
  entry: {
    'web-components': 'src/index.ts',
    'web-components.adapter.server': 'src/adapter.server.ts',
    'web-components.adapter.client': 'src/adapter.client.ts',
  },
  format: 'esm',
  outDir: 'dist',
  splitting: true,
  target: 'chrome67',
});
