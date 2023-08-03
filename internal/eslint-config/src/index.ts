import coreRules from "./core";
import { defineConfig } from "eslint-define-config";
import importRules from "./import";
import reactRules from "./react";
import typescriptRules from "./typescript";

const OFF = 0;
// const WARN = 1;
// const ERROR = 2;

export default defineConfig({
  parser: "@babel/eslint-parser",
  parserOptions: {
    sourceType: "module",
    requireConfigFile: false,
    ecmaVersion: "latest",
    babelOptions: {
      presets: ["@babel/preset-react"],
    },
  },
  env: {
    browser: true,
    commonjs: false,
    node: false,
    es6: true,
  },
  settings: {
    "import/resolver": {
      typescript: true,
      node: true,
    },
  },
  plugins: ["import", "react", "react-hooks"],
  extends: [
    "plugin:import/typescript",
    "plugin:@typescript-eslint/recommended",
    "eslint:recommended",
    "plugin:jsonc/recommended-with-jsonc",
    "plugin:prettier/recommended",
    "plugin:n/recommended",
    "plugin:import/recommended",
    "plugin:regexp/recommended",
  ],
  rules: {
    ...coreRules.rules,
    ...importRules.rules,
    ...reactRules.rules,
  },
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      rules: {
        "n/no-missing-import": OFF,
      },
    },
    {
      files: ["**/*.ts?(x)"],
      extends: [
        "plugin:import/typescript",
        "plugin:@typescript-eslint/recommended",
      ],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2019,
      },
      plugins: ["@typescript-eslint"],
      rules: {
        ...typescriptRules.rules,
      },
    },

    {
      files: [
        "**/routes/**/*.js?(x)",
        "**/routes/**/*.tsx",
        "app/root.js?(x)",
        "app/root.tsx",
      ],
      rules: {
        // Routes may use default exports without a name. At the route level
        // identifying components for debugging purposes is less of an issue, as
        // the route boundary is more easily identifiable.
        "react/display-name": OFF,
      },
    },

    {
      files: ["*.json", "*.json5", "*.jsonc"],
      parser: "jsonc-eslint-parser",
    },
    {
      files: ["**.test.ts"],
      rules: {
        "no-console": "off",
      },
    },
    {
      files: ["package.json"],
      parser: "jsonc-eslint-parser",
      rules: {
        "jsonc/sort-keys": "off",
      },
    },
  ],
  ignorePatterns: ["**/vendor/**", "**/dist/**", "**/node_modules/**"],
});
