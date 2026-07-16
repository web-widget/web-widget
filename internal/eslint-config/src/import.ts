// const OFF = 0;
const WARN = 1;
const ERROR = 2;

export default {
  rules: {
    'import/first': ERROR,
    'import/no-amd': ERROR,
    'import/no-duplicates': ERROR,
    'import/no-webpack-loader-syntax': ERROR,
    'import/order': WARN,
    'import/no-unresolved': [
      ERROR,
      {
        ignore: ['^@placeholder$'],
      },
    ],
  },
};
