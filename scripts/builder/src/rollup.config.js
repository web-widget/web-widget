/* eslint-disable import/no-dynamic-require, global-require */
/* global require, process */
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default () => {
  const isProduction = process.env.NODE_ENV !== 'development';
  const cwd = process.cwd();
  const {
    source,
    main,
    module,
    system,
    unpkg,
    libraryName
  } = require(`${cwd}/package.json`);

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

  return {
    input: source,
    output: [
      {
        file: unpkg,
        name: libraryName,
        format: 'umd',
        sourcemap: true
      },
      {
        file: module,
        format: 'esm',
        sourcemap: true
      },
      {
        file: system,
        format: 'system',
        sourcemap: true
      },
      {
        file: main,
        format: 'cjs',
        sourcemap: true
      }
    ],
    plugins
  };
};
