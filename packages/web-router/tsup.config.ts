import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "web-router.server": "src/index.ts",
    vite: "src/vite.ts",
  },
  dts: true,
  target: "es2022",
  splitting: true,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
