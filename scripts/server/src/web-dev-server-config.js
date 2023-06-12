/* global module, require */
const { hmrPlugin } = require('@web/dev-server-hmr');
const { esbuildPlugin } = require('@web/dev-server-esbuild');

module.exports = {
  nodeResolve: true,
  plugins: [
    hmrPlugin(),
    esbuildPlugin(),
  ]
};
