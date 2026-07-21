import { describe, expect, test } from '@jest/globals';
import { createStableDevCssModulesPlugin } from './stable-css-modules';
import type { RouterPluginHost } from '@/router/host';

describe('createStableDevCssModulesPlugin', () => {
  function getHook(plugin: ReturnType<typeof createStableDevCssModulesPlugin>) {
    return {
      transform: plugin.transform as Function,
      hotUpdate: plugin.hotUpdate as Function,
    };
  }

  test('makes stable client CSS Modules self-accepting', () => {
    const host = {
      state: { stableDevCssModuleNames: true },
    } as RouterPluginHost;
    const plugin = createStableDevCssModulesPlugin(host);
    const { transform } = getHook(plugin);

    expect(
      transform('export default { button: "stable" };', '/app/a.module.css')
    ).toContain('import.meta.hot.accept();');
  });

  test('does not alter CSS Modules with custom class names', () => {
    const host = {
      state: { stableDevCssModuleNames: false },
    } as RouterPluginHost;
    const plugin = createStableDevCssModulesPlugin(host);
    const { transform } = getHook(plugin);

    expect(
      transform('export default { button: "custom" };', '/app/a.module.css')
    ).toBeUndefined();
  });

  test('marks stable CSS Module graph nodes as self-accepting', () => {
    const host = {
      state: { stableDevCssModuleNames: true },
    } as RouterPluginHost;
    const { hotUpdate } = getHook(createStableDevCssModulesPlugin(host));
    const cssModule = {
      id: '/app/a.module.css',
      isSelfAccepting: false,
    };
    const importer = { id: '/app/widget.ts', isSelfAccepting: false };

    expect(hotUpdate({ modules: [cssModule, importer] })).toEqual([cssModule]);
    expect(cssModule.isSelfAccepting).toBe(true);
    expect(importer.isSelfAccepting).toBe(false);
  });
});
