import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "vue.server": "server.ts",
    "vue.client": "client.ts",
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
