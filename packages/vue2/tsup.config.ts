import type { Options } from "tsup";

const baseOptions: Options = {
  dts: true,
  target: "es2017",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};

export const tsup: Options[] = [
  {
    ...baseOptions,
    entry: {
      "vue2.server": "src/server.ts",
    },
    format: ["esm", "cjs"],
  },
  {
    ...baseOptions,
    entry: {
      "vue2.client": "src/client.ts",
      vite: "src/vite.ts",
    },
  },
  {
    ...baseOptions,
    entry: {
      vite: "src/vite.ts",
    },
    format: ["esm", "cjs"],
  },
];
