import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import webWidgetConfig from '@internal/eslint-config';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/libs/**',
      '**/_site/**',
      '**/_site-dev/**',
      'docs/_merged_assets/**',
      'docs/_merged_data/**',
      'docs/_merged_includes/**',
      'packages/umd-loader/examples/module-federation/**',
    ],
  },
  ...compat.config(webWidgetConfig),
  ...compat.config({
    overrides: [
      {
        files: [
          'packages/html/src/hrc-runtime.js',
          'packages/web-widget/src/__fixtures__/**/*.js',
        ],
        env: {
          browser: true,
        },
      },
    ],
  }),
  ...compat.config({
    overrides: [
      {
        files: ['packages/**/test/**/*.js', 'packages/**/examples/**/*.js'],
        env: {
          amd: false,
          browser: true,
          es6: true,
          node: false,
          mocha: true,
        },
        rules: {
          'no-console': 'off',
        },
      },
    ],
  }),
];
