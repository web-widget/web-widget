/* global require, module, process */
const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

module.exports = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const debug = isProduction ? '' : '.debug';

  const plugins = [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || '')
      }
    }),
    nodeResolve()
  ];

  if (isProduction) {
    plugins.push(
      terser({
        keep_classnames: true
      })
    );
  }

  return [
    {
      input: 'src/index.js',
      output: [
        {
          file: `dist/umd/web-widget${debug}.js`,
          name: 'HTMLWebWidgetElement',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/esm/web-widget${debug}.js`,
          format: 'esm',
          sourcemap: true
        },
        {
          file: `dist/cjs/web-widget${debug}.js`,
          format: 'cjs',
          sourcemap: true
        }
      ],
      plugins
    }
  ];
};
