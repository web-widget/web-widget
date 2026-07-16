import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createPublishedPackageJson,
  withPublishedPackageManifests,
} from './published-package-manifests.js';

test('uses publishConfig exports for the published manifest', () => {
  const exports = { '.': { default: './dist/index.js' } };
  const published = createPublishedPackageJson({
    exports: {
      '.': {
        development: './src/index.ts',
        default: './dist/index.js',
      },
    },
    publishConfig: { access: 'public', exports },
  });

  assert.deepEqual(published.exports, exports);
});

test('removes nested development conditions without publishConfig exports', () => {
  const published = createPublishedPackageJson({
    exports: {
      '.': {
        worker: {
          development: './src/server.ts',
          default: './dist/server.js',
        },
        default: './dist/index.js',
      },
    },
  });

  assert.deepEqual(published.exports, {
    '.': {
      worker: { default: './dist/server.js' },
      default: './dist/index.js',
    },
  });
});

test('restores package manifests when the callback fails', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'published-manifest-'));
  const packagePath = path.join(directory, 'package.json');
  const original = `${JSON.stringify({
    exports: {
      '.': {
        development: './src/index.ts',
        default: './dist/index.js',
      },
    },
  })}\n`;
  await writeFile(packagePath, original);

  await assert.rejects(
    withPublishedPackageManifests([packagePath], async () => {
      const materialized = JSON.parse(await readFile(packagePath, 'utf8'));
      assert.equal(materialized.exports['.'].development, undefined);
      throw new Error('publish failed');
    }),
    /publish failed/
  );
  assert.equal(await readFile(packagePath, 'utf8'), original);
});
