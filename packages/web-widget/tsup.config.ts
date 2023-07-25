import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "web-widget": "src/index.ts",
  },
  dts: true,
  target: "es2017",
  splitting: false,
  sourcemap: true,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
