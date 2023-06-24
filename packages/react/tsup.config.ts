import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "react.server": "server.ts",
    "react.client": "client.ts",
    "jsx-runtime": "jsx-runtime.ts",
    "jsx-dev-runtime": "jsx-dev-runtime.ts",
    "babel-plugin": "babel-plugin.ts",
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
