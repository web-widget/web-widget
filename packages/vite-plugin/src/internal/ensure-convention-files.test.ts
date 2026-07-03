import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import { parseWebRouterConfig } from './config';
import {
  EMPTY_IMPORTMAP,
  ensureConventionFiles,
  formatMissingRoutemapError,
  requireConventionEntry,
} from './ensure-convention-files';

describe('requireConventionEntry', () => {
  test('throws actionable error when entry is missing', () => {
    expect(() =>
      requireConventionEntry(
        'entry.server',
        'entry.server',
        '/app',
        ['.ts'],
        () => false
      )
    ).toThrow(/Missing entry\.server/);
    expect(() =>
      requireConventionEntry(
        'entry.server',
        'entry.server',
        '/app',
        ['.ts'],
        () => false
      )
    ).toThrow(/import\.meta\.framework/);
  });
});

describe('parseWebRouterConfig with optional convention files', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  test('resolves routemap and importmap paths without requiring files on disk', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-config-'));
    await fs.writeFile(
      path.join(tempDir, 'entry.client.ts'),
      'export {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'entry.server.ts'),
      'export {}',
      'utf-8'
    );
    await fs.mkdir(path.join(tempDir, 'routes'), { recursive: true });

    const config = parseWebRouterConfig(
      { filesystemRouting: { enabled: true } },
      tempDir
    );

    expect(config.input.client.importmap).toBe(
      path.join(tempDir, 'importmap.client.json')
    );
    expect(config.input.server.routemap).toBe(
      path.join(tempDir, 'routemap.server.json')
    );
    expect(config.filesystemRouting.dir).toBe(path.join(tempDir, 'routes'));
  });
});

describe('ensureConventionFiles', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  test('creates empty importmap when missing', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-ensure-'));
    await fs.writeFile(
      path.join(tempDir, 'entry.client.ts'),
      'export {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'entry.server.ts'),
      'export {}',
      'utf-8'
    );

    const config = parseWebRouterConfig(
      { filesystemRouting: { enabled: true } },
      tempDir
    );
    const importmapPath = config.input.client.importmap;

    await ensureConventionFiles({ config, root: tempDir });

    expect(JSON.parse(await fs.readFile(importmapPath, 'utf-8'))).toEqual(
      EMPTY_IMPORTMAP
    );
  });

  test('generates routemap from filesystem routing when missing', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-ensure-'));
    await fs.writeFile(
      path.join(tempDir, 'entry.client.ts'),
      'export {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'entry.server.ts'),
      'export {}',
      'utf-8'
    );

    const config = parseWebRouterConfig(
      { filesystemRouting: { enabled: true } },
      tempDir
    );

    await ensureConventionFiles({ config, root: tempDir });

    const routemap = JSON.parse(
      await fs.readFile(config.input.server.routemap, 'utf-8')
    );
    expect(routemap.routes).toEqual([]);
  });

  test('creates routes directory when filesystem routing is enabled', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-ensure-'));
    await fs.writeFile(
      path.join(tempDir, 'entry.client.ts'),
      'export {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'entry.server.ts'),
      'export {}',
      'utf-8'
    );

    const config = parseWebRouterConfig(
      { filesystemRouting: { enabled: true } },
      tempDir
    );

    await ensureConventionFiles({ config, root: tempDir });

    expect(await fs.stat(config.filesystemRouting.dir)).toBeDefined();
  });

  test('fails with guidance when routemap is missing and filesystem routing is disabled', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-ensure-'));
    await fs.writeFile(
      path.join(tempDir, 'entry.client.ts'),
      'export {}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'entry.server.ts'),
      'export {}',
      'utf-8'
    );
    await fs.mkdir(path.join(tempDir, 'routes'), { recursive: true });
    const config = parseWebRouterConfig({}, tempDir);

    await expect(
      ensureConventionFiles({ config, root: tempDir })
    ).rejects.toThrow(formatMissingRoutemapError(config.input.server.routemap));
  });
});
