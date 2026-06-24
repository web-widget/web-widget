import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@jest/globals';
import {
  parseWebRouterConfig,
  resolveRealFile,
  WEB_ROUTER_CONFIG_DEFAULTS,
} from './config';

describe('resolveRealFile', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  test('resolves the first matching extension', async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ww-config-'));
    const entryPath = path.join(tempDir, 'entry.server.ts');
    await fs.writeFile(entryPath, 'export default {}', 'utf-8');

    expect(resolveRealFile('entry.server', tempDir)).toBe(entryPath);
  });

  test('uses injected fileExists without touching disk', () => {
    const seen: string[] = [];
    const exists = (file: string) => {
      seen.push(file);
      return file.endsWith('importmap.client.json');
    };

    expect(
      resolveRealFile('importmap.client', '/virtual', ['.json'], exists)
    ).toBe(path.resolve('/virtual', 'importmap.client.json'));
    expect(seen.length).toBeGreaterThan(0);
  });
});

describe('parseWebRouterConfig', () => {
  let tempDir = '';

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  test('merges defaults and resolves real paths', async () => {
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
    await fs.writeFile(
      path.join(tempDir, 'importmap.client.json'),
      '{}',
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'routemap.server.json'),
      '{"routes":[]}',
      'utf-8'
    );
    await fs.mkdir(path.join(tempDir, 'routes'), { recursive: true });

    const config = parseWebRouterConfig({}, tempDir);

    expect(config.asyncContext.enabled).toBe(
      WEB_ROUTER_CONFIG_DEFAULTS.asyncContext.enabled
    );
    expect(config.input.client.entry).toBe(
      path.join(tempDir, 'entry.client.ts')
    );
    expect(config.input.server.routemap).toBe(
      path.join(tempDir, 'routemap.server.json')
    );
    expect(config.filesystemRouting.dir).toBe(path.join(tempDir, 'routes'));
  });
});
