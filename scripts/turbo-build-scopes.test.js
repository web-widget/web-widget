import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const turbo = require.resolve('turbo');

function getPackages(filters) {
  const output = execFileSync(
    turbo,
    [
      'run',
      'build',
      ...filters.map((filter) => `--filter=${filter}`),
      '--dry=json',
    ],
    { encoding: 'utf8' }
  );
  return JSON.parse(output).packages;
}

test('package builds exclude examples, playgrounds, and benchmarks', () => {
  const packages = getPackages(['./packages/*', './internal/*']);
  assert.ok(packages.length > 0);
  assert.ok(
    packages.every(
      (name) => name.startsWith('@web-widget/') || name.startsWith('@internal/')
    )
  );
});

test('playground builds only include playground workspaces', () => {
  const packages = getPackages(['@playgrounds/*']);
  assert.ok(packages.length > 0);
  assert.ok(packages.every((name) => name.startsWith('@playgrounds/')));
});

test('benchmark builds only include benchmark workspaces', () => {
  const packages = getPackages(['@benchmarks/*']);
  assert.ok(packages.length > 0);
  assert.ok(packages.every((name) => name.startsWith('@benchmarks/')));
});
