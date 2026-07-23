import { jest } from '@jest/globals';
import { createServerAssetsPlugin } from './server-assets-plugin';
import { createRouterPluginHost } from './host';
import {
  SERVER_ASSETS_DATA_FILE_NAME,
  SERVER_ASSETS_DATA_MODULE_ID,
  SERVER_ASSETS_DATA_RESOLVED_ID,
  SERVER_ASSETS_MODULE_ID,
  SERVER_ASSETS_RESOLVED_ID,
  generateServerAssetsDataModuleCode,
  generateServerAssetsDevModuleCode,
  generateServerAssetsModuleCode,
  generateServerAssetsPlaceholderCode,
} from '@/internal/server-assets-module';

describe('createServerAssetsPlugin', () => {
  function hooks() {
    const host = createRouterPluginHost();
    const plugin = createServerAssetsPlugin(host);
    return {
      host,
      configResolved: plugin.configResolved as Function,
      generateBundle: plugin.generateBundle as Function,
      load: plugin.load as Function,
      resolveId: plugin.resolveId as Function,
    };
  }

  test('resolves both server asset virtual modules', () => {
    const { resolveId } = hooks();

    expect(resolveId(SERVER_ASSETS_MODULE_ID)).toBe(SERVER_ASSETS_RESOLVED_ID);
    expect(resolveId(SERVER_ASSETS_DATA_MODULE_ID)).toBe(
      SERVER_ASSETS_DATA_RESOLVED_ID
    );
    expect(resolveId('/ordinary.ts')).toBeNull();
  });

  test('loads dev stubs and build modules for the current command', () => {
    const dev = hooks();
    dev.configResolved({ command: 'serve', build: {} });
    expect(dev.load(SERVER_ASSETS_RESOLVED_ID)).toBe(
      generateServerAssetsDevModuleCode()
    );

    const build = hooks();
    build.configResolved({ command: 'build', build: {} });
    expect(build.load(SERVER_ASSETS_RESOLVED_ID)).toBe(
      generateServerAssetsModuleCode()
    );
    expect(build.load(SERVER_ASSETS_DATA_RESOLVED_ID)).toBe(
      generateServerAssetsDataModuleCode()
    );
    expect(build.load('/ordinary.ts')).toBeNull();
  });

  test('emits the placeholder under the configured assets directory', () => {
    const { configResolved, generateBundle, host } = hooks();
    const emitFile = jest.fn();
    configResolved({ command: 'build', build: { assetsDir: 'static' } });

    generateBundle.call({ emitFile });

    expect(host.state.serverAssetsDir).toBe('static');
    expect(emitFile).toHaveBeenCalledWith({
      type: 'prebuilt-chunk',
      fileName: `static/${SERVER_ASSETS_DATA_FILE_NAME}`,
      code: generateServerAssetsPlaceholderCode(),
    });
  });
});
