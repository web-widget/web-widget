import { describe, expect, test } from '@jest/globals';
import { resetDevServerRevisionForTests } from './dev-server-cache';
import { invalidateServerDevModules } from './server-invalidation';
import type { ResolvedWebRouterConfig } from '@/types';

describe('invalidateServerDevModules', () => {
  test('invalidates server entry and routemap modules', async () => {
    resetDevServerRevisionForTests();

    const entryMod = { id: 'entry.server.ts' };
    const routemapMod = { id: 'routemap.server.json' };
    const invalidated: unknown[] = [];

    const moduleGraph = {
      getModulesByFile(file: string) {
        if (file.endsWith('entry.server.ts')) {
          return new Set([entryMod]);
        }
        if (file.endsWith('routemap.server.json')) {
          return new Set([routemapMod]);
        }
        return undefined;
      },
      invalidateModule(mod: unknown) {
        invalidated.push(mod);
      },
    };

    const config = {
      input: {
        server: {
          entry: '/project/entry.server.ts',
          routemap: '/project/routemap.server.json',
        },
      },
    } as ResolvedWebRouterConfig;

    await invalidateServerDevModules(moduleGraph, config);

    expect(invalidated).toEqual([entryMod, routemapMod]);
  });
});
