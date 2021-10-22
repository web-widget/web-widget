/* eslint-disable no-undef */
const os = require('os');
const fs = require('fs');

const portFileName = 'WEBWIDGET_TESTER_SERVER_PORT';
const file = os.tmpdir() + portFileName;
const start = 7999;

let port = start;

try {
  const temp = fs.readFileSync(file, 'utf8');

  if (temp) {
    port = Number(temp);
  }

  if (port > start + 999) {
    port = start;
  }

  // eslint-disable-next-line no-empty
} catch (error) {}

port++;

fs.writeFileSync(file, String(port), 'utf8');

module.exports = port;
