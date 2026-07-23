import { createRemoveAsyncHooksPlugin } from './remove-async-hooks';
import type { RouterPluginHost } from './host';

describe('createRemoveAsyncHooksPlugin', () => {
  function createPlugin(enabled: boolean) {
    const host = {
      state: {
        resolvedWebRouterConfig: { asyncContext: { enabled } },
      },
    } as RouterPluginHost;
    const plugin = createRemoveAsyncHooksPlugin(host);
    return {
      load: plugin.load as Function,
      resolveId: plugin.resolveId as Function,
    };
  }

  test('keeps the Node module when async context is enabled', async () => {
    const { load, resolveId } = createPlugin(true);

    await expect(resolveId('node:async_hooks')).resolves.toBe(false);
    await expect(load('node:async_hooks')).resolves.toBeNull();
  });

  test('replaces the Node module when async context is disabled', async () => {
    const { load, resolveId } = createPlugin(false);

    await expect(resolveId('node:async_hooks')).resolves.toBe(
      'node:async_hooks'
    );
    await expect(load('node:async_hooks')).resolves.toBe(
      'export const AsyncLocalStorage = undefined'
    );
  });

  test('ignores unrelated modules', async () => {
    const { load, resolveId } = createPlugin(false);

    await expect(resolveId('node:path')).resolves.toBeNull();
    await expect(load('node:path')).resolves.toBeNull();
  });
});
