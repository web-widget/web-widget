/* global require, module, process */
const { terser } = require('rollup-plugin-terser');
const replace = require('@rollup/plugin-replace');

module.exports = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const debug = isProduction ? '' : '.debug';

  const plugins = [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || '')
      }
    })
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
      input: 'extensions/HTMLWebWidgetImportElement.js',
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
      input: 'extensions/HTMLWebComponentImportElement.js',
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
      input: 'extensions/WebWidgetRouter/index.js',
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
