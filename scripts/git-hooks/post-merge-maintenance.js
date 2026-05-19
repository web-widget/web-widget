#!/usr/bin/env node

/**
 * post-merge / post-rebase: refresh generated files when upstream changed
 * catalog or workspace package names. Leaves unstaged edits for review.
 */

import {
  examplePackageJsonRelPaths,
  mergeChangedPaths,
  rootDir,
  sh,
} from './lib.js';

function norm(p) {
  return p.replace(/\\/g, '/');
}

const changed = mergeChangedPaths().map(norm);

if (changed.length === 0) {
  process.exit(0);
}

const needsExamplesCatalog = changed.some((f) => f === 'pnpm-workspace.yaml');
const needsPnpmOverrides = changed.some(
  (f) => f.startsWith('packages/') && f.endsWith('/package.json')
);

if (needsExamplesCatalog) {
  sh('node scripts/materialize-examples-catalog.js');
}

if (needsPnpmOverrides) {
  sh('node scripts/sync-pnpm-overrides.js');
}

if (!needsExamplesCatalog && !needsPnpmOverrides) {
  process.exit(0);
}

console.log(
  '\nNOTE: Maintenance scripts updated workspace files. Review and stage if needed:'
);
if (needsExamplesCatalog) {
  for (const rel of examplePackageJsonRelPaths()) {
    console.log(`  ${rel}`);
  }
}
if (needsPnpmOverrides) {
  console.log('  package.json');
}
