#!/usr/bin/env node

/**
 * post-merge / post-rebase: refresh generated files when the upstream catalog
 * changed. Leaves unstaged edits for review.
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

if (!needsExamplesCatalog) {
  process.exit(0);
}

sh('node scripts/materialize-examples-catalog.js');

console.log(
  '\nNOTE: Maintenance scripts updated workspace files. Review and stage if needed:'
);
for (const rel of examplePackageJsonRelPaths()) {
  console.log(`  ${rel}`);
}
