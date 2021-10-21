/* eslint-disable no-undef */
const os = require('os');
const fs = require('fs');

const portFileName = 'WEBWIDGET_TESTER_SERVER_PORT';
const file = os.tmpdir() + portFileName;

let port = 8100;

try {
  const temp = fs.readFileSync(file, 'utf8');

  if (temp) {
    port = Number(temp);
  }
  // eslint-disable-next-line no-empty
} catch (error) {}

port++;

fs.writeFileSync(file, String(port), 'utf8');

module.exports = {
  files: ['test/**/*.test.js'],
  nodeResolve: true,
  rootDir: './',
  port,
  coverageConfig: {
    include: ['src/**/*']
  }
};
