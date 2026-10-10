#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packagesDir = join(root, 'packages');
const destination = mkdtempSync(join(tmpdir(), 'web-widget-publish-'));
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

try {
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const cwd = join(packagesDir, entry.name);
    const original = JSON.parse(
      readFileSync(join(cwd, 'package.json'), 'utf8')
    );
    if (original.private) continue;

    const tarball = join(destination, `${entry.name}.tgz`);
    execFileSync('pnpm', ['pack', '--out', tarball], {
      cwd,
      stdio: 'pipe',
    });
    const manifest = JSON.parse(
      execFileSync('tar', ['-xOf', tarball, 'package/package.json'], {
        encoding: 'utf8',
      })
    );

    for (const field of dependencyFields) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        assert.doesNotMatch(
          range,
          /^(workspace|catalog|link|file):/,
          `${manifest.name}: ${field}.${name} contains a local dependency: ${range}`
        );
      }
    }

    assert.deepEqual(
      manifest.exports,
      original.publishConfig?.exports ?? original.exports,
      `${manifest.name}: packed exports do not match the publish configuration`
    );
    console.log(`Checked ${manifest.name}@${manifest.version}`);
  }
} finally {
  rmSync(destination, { recursive: true, force: true });
}
