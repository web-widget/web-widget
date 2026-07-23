import { jest } from '@jest/globals';
import { importActionPlugin } from './import-action';

describe('importActionPlugin', () => {
  function getHooks(plugin: ReturnType<typeof importActionPlugin>) {
    return {
      configResolved: plugin.configResolved as Function,
      transform: plugin.transform as Function,
    };
  }

  function transformContext() {
    return {
      error(error: unknown): never {
        throw error instanceof Error ? error : new Error(String(error));
      },
    };
  }

  function routerPlugin(api: object) {
    return {
      name: '@web-widget:router',
      api,
    };
  }

  test('uses a custom serverUrl without requiring a router plugin', async () => {
    const serverUrl = jest.fn(async () => '/api/tasks');
    const { configResolved, transform } = getHooks(
      importActionPlugin({ serverUrl })
    );
    await configResolved({ root: '/project', plugins: [] });

    const result = await transform.call(
      transformContext(),
      'export async function save() {}\nexport default async function remove() {}',
      '/project/tasks@action.ts'
    );

    expect(serverUrl).toHaveBeenCalledWith('/project/tasks@action.ts');
    expect(result).toEqual({
      code:
        'import { rpcClient } from "@web-widget/helpers/action";\n' +
        'const __$exports0$__ = /* @__PURE__ */ rpcClient("/api/tasks")\n' +
        'export const save = __$exports0$__.save;\n' +
        'export default __$exports0$__.default;',
      map: null,
    });
  });

  test('resolves action URLs from the router routemap', async () => {
    const serverRoutemap = jest.fn(async () => ({
      actions: [{ module: './tasks@action.ts', pathname: '/tasks' }],
    }));
    const api = {
      config: { serverAction: { enabled: true } },
      serverRoutemap,
    };
    const { configResolved, transform } = getHooks(importActionPlugin());
    await configResolved({
      root: '/project',
      plugins: [routerPlugin(api)],
    });

    const result = await transform.call(
      transformContext(),
      'export const save = () => {}',
      '/project/tasks@action.ts'
    );

    expect(serverRoutemap).toHaveBeenCalledTimes(1);
    expect(result.code).toContain('rpcClient("/tasks")');
  });

  test('skips transforms when server actions are disabled', async () => {
    const serverRoutemap = jest.fn(async () => ({ actions: [] }));
    const api = {
      config: { serverAction: { enabled: false } },
      serverRoutemap,
    };
    const { configResolved, transform } = getHooks(importActionPlugin());
    await configResolved({
      root: '/project',
      plugins: [routerPlugin(api)],
    });

    await expect(
      transform.call(
        transformContext(),
        'export const save = () => {}',
        '/project/tasks@action.ts'
      )
    ).resolves.toBeNull();
    expect(serverRoutemap).not.toHaveBeenCalled();
  });

  test('skips excluded modules and modules without exports', async () => {
    const serverUrl = jest.fn(async () => '/tasks');
    const { configResolved, transform } = getHooks(
      importActionPlugin({ exclude: '**/private/**', serverUrl })
    );
    await configResolved({ root: '/project', plugins: [] });

    await expect(
      transform.call(
        transformContext(),
        'export const save = () => {}',
        '/project/private/tasks@action.ts'
      )
    ).resolves.toBeNull();
    await expect(
      transform.call(
        transformContext(),
        'const save = () => {}',
        '/project/tasks@action.ts'
      )
    ).resolves.toBeNull();
    expect(serverUrl).not.toHaveBeenCalled();
  });

  test('requires either serverUrl or the router plugin', async () => {
    const { configResolved } = getHooks(importActionPlugin());

    await expect(
      configResolved({ root: '/project', plugins: [] })
    ).rejects.toThrow('"serverUrl" option is required.');
  });

  test('reports missing and empty action URLs through the plugin context', async () => {
    const api = {
      config: { serverAction: { enabled: true } },
      serverRoutemap: async () => ({ actions: [] }),
    };
    const routed = getHooks(importActionPlugin());
    await routed.configResolved({
      root: '/project',
      plugins: [routerPlugin(api)],
    });

    await expect(
      routed.transform.call(
        transformContext(),
        'export const save = () => {}',
        '/project/tasks@action.ts'
      )
    ).rejects.toThrow('not registered in the server routing table');

    const custom = getHooks(importActionPlugin({ serverUrl: async () => '' }));
    await custom.configResolved({ root: '/project', plugins: [] });
    await expect(
      custom.transform.call(
        transformContext(),
        'export const save = () => {}',
        '/project/tasks@action.ts'
      )
    ).rejects.toThrow('returns no result');
  });
});
