#!/usr/bin/env node
/**
 * Publish wrapper that forces changesets to use `npm publish` instead of
 * `pnpm publish`, so that npm OIDC Trusted Publishing works correctly.
 *
 * pnpm 11's native publish does not delegate to the npm CLI, which means the
 * OIDC token exchange required by npm Trusted Publishing never happens.
 *
 * Changesets picks the publish tool using the `packageManager` field and lockfile.
 * We temporarily identify npm as the package manager so the pnpm lockfile does
 * not make changesets select `pnpm publish`. npm automatically detects the OIDC
 * environment in GitHub Actions.
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const pkgPath = new URL('../package.json', import.meta.url).pathname;
const original = readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(original);

// An explicit packageManager takes precedence over the pnpm lockfile.
pkg.packageManager = 'npm@11';
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

try {
  execSync('changeset publish', { stdio: 'inherit' });
} finally {
  // Always restore the original package.json.
  writeFileSync(pkgPath, original);
}
