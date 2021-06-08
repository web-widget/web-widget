/* global require, module, process */
const minify = require('rollup-plugin-babel-minify');

module.exports = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const debug = isProduction ? '' : '.debug';

  const plugins = [];

  if (isProduction) {
    plugins.push(
      minify({
        comments: false
      })
    );
  }

  return [
    {
      input: 'src/HTMLWebWidgetElement.js',
      output: [
        {
          file: `dist/web-widget.umd${debug}.js`,
          name: 'WebWidget',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/web-widget.esm${debug}.js`,
          format: 'esm',
          sourcemap: true
        }
      ],
      plugins
    },
    {
      input: 'src/HTMLWebWidgetElement.js',
      output: [
        {
          file: `dist/web-widget.umd${debug}.js`,
          name: 'WebWidget',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/web-widget.esm${debug}.js`,
          format: 'esm',
          sourcemap: true
        }
      ],
      plugins
    },
    {
      input: 'src/WebWidgetRouter.js',
      output: [
        {
          file: `dist/web-widget-router.umd${debug}.js`,
          name: 'WebWidget',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/web-widget-router.esm${debug}.js`,
          format: 'esm',
          sourcemap: true
        }
      ],
      plugins
    }
  ];
};
