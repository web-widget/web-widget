import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    element: 'src/element.ts',
  },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['lit'],
  target: 'es2020',
  treeshake: true,
});
