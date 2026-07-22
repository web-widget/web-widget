import { defineConfig } from 'tsup';
export default defineConfig({
  dts: true,
  entry: {
    solid: 'src/index.ts',
    'solid.transform': 'src/transform.ts',
    'solid.adapter.server': 'src/adapter.server.ts',
    'solid.adapter.client': 'src/adapter.client.ts',
  },
  format: 'esm',
  outDir: 'dist',
  splitting: true,
  target: 'chrome67',
});
