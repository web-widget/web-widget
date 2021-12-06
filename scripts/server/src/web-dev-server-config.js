/* global module, require */
const { hmrPlugin } = require('@web/dev-server-hmr');

module.exports = {
  nodeResolve: true,
  plugins: [hmrPlugin()]
};
