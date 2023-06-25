import type { Options } from "tsup";
export const tsup: Options = {
  entry: {
    "react.server": "src/server.ts",
    "react.client": "src/client.ts",
    "jsx-runtime": "src/jsx-runtime.ts",
    "jsx-dev-runtime": "src/jsx-dev-runtime.ts",
    "babel-plugin": "src/babel-plugin.ts",
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
