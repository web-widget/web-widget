/* global process */
import rollupReplace from '@rollup/plugin-replace';
import { fromRollup } from '@web/dev-server-rollup';

const replace = fromRollup(rollupReplace);
const index = process.env.INDEX || 'index.html';

export default {
  nodeResolve: true,
  appIndex: index,
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
