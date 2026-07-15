#!/usr/bin/env node

/**
 * pre-commit: when staged changes affect the catalog, refresh generated JSON,
 * stage updates, then run nano-staged (prettier / finepack).
 */

import { spawnSync } from 'child_process';

import { examplePackageJsonRelPaths, rootDir, sh, stagedPaths } from './lib.js';

function norm(p) {
  return p.replace(/\\/g, '/');
}

const normStaged = stagedPaths().map(norm);

const needsExamplesCatalog = normStaged.includes('pnpm-workspace.yaml');

if (needsExamplesCatalog) {
  sh('node scripts/materialize-examples-catalog.js');
  for (const rel of examplePackageJsonRelPaths()) {
    sh(`git add -- "${rel}"`);
  }
}

const nano = spawnSync('./node_modules/.bin/nano-staged', [], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

process.exit(typeof nano.status === 'number' ? nano.status : 1);
