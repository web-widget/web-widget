import { defineConfig } from "eslint-define-config";

const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default defineConfig({
  rules: {
    "n/no-missing-import": OFF,
    "n/no-unpublished-import": OFF,
    "n/no-process-exit": WARN,
    "n/no-unsupported-features/es-syntax": [
      "error",
      {
        version: ">=18.0.0",
        ignores: [],
      },
    ],
    "n/no-extraneous-import": [
      ERROR,
      {
        allowModules: ["prettier"],
      },
    ],
  },
});
