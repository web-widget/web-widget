/* global process */
import rollupReplace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';

const replace = fromRollup(rollupReplace);

export default {
  nodeResolve: true,
  appIndex: 'index.html',
  watch: true,
  rootDir: './',
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || '')
      }
    })
  ]
};
