import type { Options } from "tsup";
export const tsup: Options = {
  entry: { express: "index.ts" },
  dts: true,
  target: "node14",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};