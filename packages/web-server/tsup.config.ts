import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    server: "src/server/index.ts",
    client: "src/client/index.ts",
  },
  dts: true,
  target: "es2022",
  splitting: true,
  sourcemap: true,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
