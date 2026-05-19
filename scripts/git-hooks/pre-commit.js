#!/usr/bin/env node

/**
 * pre-commit: when staged changes affect catalog or workspace packages,
 * refresh generated JSON, stage updates, then run nano-staged (prettier / finepack).
 */

import { spawnSync } from 'child_process';

import { examplePackageJsonRelPaths, rootDir, sh, stagedPaths } from './lib.js';

function norm(p) {
  return p.replace(/\\/g, '/');
}

const normStaged = stagedPaths().map(norm);

const needsExamplesCatalog = normStaged.includes('pnpm-workspace.yaml');

const needsPnpmOverrides = normStaged.some(
  (f) => f.startsWith('packages/') && f.endsWith('/package.json')
);

if (needsExamplesCatalog) {
  sh('node scripts/materialize-examples-catalog.js');
  for (const rel of examplePackageJsonRelPaths()) {
    sh(`git add -- "${rel}"`);
  }
}

if (needsPnpmOverrides) {
  sh('node scripts/sync-pnpm-overrides.js');
  sh('git add -- package.json');
}

const nano = spawnSync('./node_modules/.bin/nano-staged', [], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

process.exit(typeof nano.status === 'number' ? nano.status : 1);
