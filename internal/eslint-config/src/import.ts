import { defineConfig } from 'eslint-define-config';

// const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default defineConfig({
  rules: {
    'import/first': ERROR,
    'import/no-amd': ERROR,
    'import/no-duplicates': ERROR,
    'import/no-webpack-loader-syntax': ERROR,
    'import/order': WARN,
    'import/exports-last': WARN,
  },
});
