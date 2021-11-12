#!/usr/bin/env node
/* global __dirname, require, process */
const path = require('path');
const { spawnSync } = require('child_process');

const configPath = path.resolve(__dirname, '..', 'src/rollup.config.js');

const { status, signal } = spawnSync(
  'rollup',
  ['--config', configPath, ...process.argv.slice(2)],
  {
    stdio: 'inherit'
  }
);

if (signal) {
  process.exit(1);
} else if (status !== 0) {
  process.exit(status);
}
