/* eslint-disable no-undef */
const port = require('./getPort');

module.exports = {
  files: ['test/**/*.test.js'],
  nodeResolve: true,
  rootDir: './',
  port,
  coverageConfig: {
    include: ['src/**/*']
  }
};
