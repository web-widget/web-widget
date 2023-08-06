import type { Options } from "tsup";
export const tsup: Options = {
  entry: { node: "src/index.ts" },
  dts: true,
  target: "node18",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
