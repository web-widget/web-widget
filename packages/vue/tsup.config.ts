import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "vue.server": "src/server.ts",
    "vue.client": "src/client.ts",
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
