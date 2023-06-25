import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "vue2.server": "src/server.ts",
    "vue2.client": "src/client.ts",
  },
  dts: true,
  target: "es2017",
  splitting: false,
  sourcemap: false,
  format: ["esm"],
  outDir: "dist",
  clean: true,
  external: [],
};
