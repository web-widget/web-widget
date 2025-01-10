/**
 * @type {import('eslint').Linter.Config}
 */
const config = {
  root: true,
  extends: ['@internal'],
  ignores: [
    'dist/',
    'node_modules/',
    'coverage/',
    'libs/',
    '_site/',
    '_site-dev',
    'docs/',
  ],
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
};

export default config;
