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
          name: 'HTMLWebWidgetElement',
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
      input: 'src/HTMLWebWidgetImportElement.js',
      output: [
        {
          file: `dist/web-widget-import.umd${debug}.js`,
          name: 'HTMLWebWidgetImportElement',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/web-widget-import.esm${debug}.js`,
          format: 'esm',
          sourcemap: true
        }
      ],
      plugins
    },
    {
      input: 'src/HTMLWebComponentImportElement.js',
      output: [
        {
          file: `dist/web-component-import.umd${debug}.js`,
          name: 'HTMLWebComponentImportElement',
          format: 'umd',
          sourcemap: true
        },
        {
          file: `dist/web-component-import.esm${debug}.js`,
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
          name: 'WebWidgetRouter',
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
