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

  test('invalidates changed dependencies before the server entry', async () => {
    resetDevServerRevisionForTests();

    const cssMod = { id: 'counter.module.css' };
    const entryMod = { id: 'entry.server.ts' };
    const invalidated: unknown[] = [];
    const moduleGraph = {
      getModulesByFile(file: string) {
        if (file.endsWith('counter.module.css')) return new Set([cssMod]);
        if (file.endsWith('entry.server.ts')) return new Set([entryMod]);
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

    await invalidateServerDevModules(moduleGraph, config, [
      '/project/counter.module.css',
    ]);

    expect(invalidated).toEqual([cssMod, entryMod]);
  });

  test('synchronously invalidates CSS importer chains across framework HMR boundaries', () => {
    resetDevServerRevisionForTests();

    const routeMod = { id: 'page@route.tsx' };
    const widgetMod = {
      id: 'Counter@widget.tsx',
      importers: new Set([routeMod]),
    };
    const cssMod = {
      id: 'counter.module.css',
      importers: new Set([widgetMod]),
    };
    const entryMod = { id: 'entry.server.ts' };
    const invalidated: unknown[] = [];
    const moduleGraph = {
      getModulesByFile(file: string) {
        if (file.endsWith('counter.module.css')) return new Set([cssMod]);
        if (file.endsWith('entry.server.ts')) return new Set([entryMod]);
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

    invalidateServerDevModules(moduleGraph, config, [
      '/project/counter.module.css',
    ]);

    expect(invalidated).toEqual([cssMod, widgetMod, routeMod, entryMod]);
  });

  test('invalidates SFC importer chains that contribute virtual styles', async () => {
    resetDevServerRevisionForTests();

    const routeMod = { id: 'page@route.tsx' };
    const vueStyleMod = {
      id: 'Counter@widget.vue?vue&type=style&index=0&scoped=true',
      importers: new Set([routeMod]),
    };
    const vueMod = {
      id: 'Counter@widget.vue',
      importers: new Set([routeMod]),
    };
    const entryMod = { id: 'entry.server.ts' };
    const invalidated: unknown[] = [];
    const moduleGraph = {
      getModulesByFile(file: string) {
        if (file.endsWith('Counter@widget.vue')) {
          return new Set([vueMod, vueStyleMod]);
        }
        if (file.endsWith('entry.server.ts')) return new Set([entryMod]);
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

    await invalidateServerDevModules(moduleGraph, config, [
      '/project/Counter@widget.vue',
    ]);

    expect(invalidated).toEqual([vueMod, routeMod, vueStyleMod, entryMod]);
  });
});
