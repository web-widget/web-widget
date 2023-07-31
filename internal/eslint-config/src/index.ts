import { defineConfig } from "eslint-define-config";

export default defineConfig({
  extends: [
    "eslint:recommended",
    "airbnb-base",
    "plugin:jsonc/recommended-with-jsonc",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:n/recommended",
    "plugin:import/recommended",
    "plugin:regexp/recommended",
  ],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: "latest",
    parser: "@typescript-eslint/parser",
    sourceType: "module",
    jsxPragma: "React",
    ecmaFeatures: {
      jsx: true,
    },
    project: "./tsconfig.*?.json",
    createDefaultProgram: false,
    extraFileExtensions: [".vue"],
  },
  plugins: ["vue", "@typescript-eslint", "import", "simple-import-sort"],
  rules: {
    "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
    "prettier/prettier": "error",
    "import/named": "error",
    "no-eval": "off",
    "import/extensions": "off",
    "import/no-cycle": "off",
    "prefer-destructuring": "off",
    "no-param-reassign": "off",
    "no-cond-assign": "off",
    "func-names": "off",
    "no-nested-ternary": "off",
    "no-plusplus": "off",
    strict: "off",
    "no-restricted-syntax": "off",
    "import/no-mutable-exports": "off",
    "guard-for-in": "off",
    "import/prefer-default-export": "off",
    "prefer-rest-params": "off",
    "one-var": "off",
    "prefer-spread": "off",
    "no-lonely-if": "off",
    "no-prototype-builtins": "error",
    "no-continue": "off",
    "no-shadow": "off",
    "no-multi-assign": "off",
  },
  overrides: [
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
  globals: { defineOptions: "readonly" },
  ignorePatterns: ["**/vendor/**", "**/dist/**", "**/node_modules/**"],
  settings: {
    "import/resolver": {
      node: { extensions: [".ts", ".d.ts", ".tsx"] },
    },
    "import/ignore": ["node_modules"],
  },
});
