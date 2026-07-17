import { describe, expect, test } from '@jest/globals';
import { createRouterPluginHost } from './host';
import type { ResolvedWebRouterConfig } from '@/types';
import { WEB_ROUTER_CONFIG_DEFAULTS } from '@/internal/config';

function createTestConfig(root: string): ResolvedWebRouterConfig {
  return {
    ...WEB_ROUTER_CONFIG_DEFAULTS,
    input: {
      client: {
        entry: `${root}/entry.client.ts`,
        importmap: `${root}/importmap.client.json`,
      },
      server: {
        entry: `${root}/entry.server.ts`,
        routemap: `${root}/routemap.server.json`,
      },
    },
  };
}

describe('createRouterPluginHost', () => {
  it('combines widget module filters registered by multiple adapters', () => {
    const host = createRouterPluginHost();

    host.api.setWidgetModuleFilter((modulePath) => modulePath.endsWith('.vue'));
    host.api.setWidgetModuleFilter((modulePath) => modulePath.endsWith('.tsx'));

    expect(host.api.widgetModuleFilter?.('/routes/Counter@widget.vue')).toBe(
      true
    );
    expect(host.api.widgetModuleFilter?.('/routes/Counter@widget.tsx')).toBe(
      true
    );
    expect(host.api.widgetModuleFilter?.('/routes/Counter@widget.svelte')).toBe(
      false
    );
  });

  it('registers widget metadata from resolved adapter plugins', () => {
    const host = createRouterPluginHost();

    host.registerWidgetPlugins([
      {
        name: '@web-widget:widget-module-filter',
        api: {
          filter: (modulePath: string) => modulePath.endsWith('.vue'),
          defaults: { loading: 'idle', renderTarget: 'shadow' },
        },
      } as any,
      {
        name: '@web-widget:widget-module-filter',
        api: {
          filter: (modulePath: string) => modulePath.endsWith('.tsx'),
          defaults: { loading: 'idle', renderTarget: 'shadow' },
        },
      } as any,
    ]);

    expect(host.api.widgetDefaults).toEqual({
      loading: 'idle',
      renderTarget: 'shadow',
    });
    expect(host.api.widgetModuleFilter?.('/routes/Counter@widget.vue')).toBe(
      true
    );
    expect(host.api.widgetModuleFilter?.('/routes/Counter@widget.tsx')).toBe(
      true
    );
  });

  it('rejects conflicting widget defaults', () => {
    const host = createRouterPluginHost();

    host.api.setWidgetDefaults({ renderTarget: 'shadow' });

    expect(() => host.api.setWidgetDefaults({ renderTarget: 'light' })).toThrow(
      'Conflicting widget default "renderTarget" values'
    );
  });
  test('reads importmap and routemap via injected readFile', async () => {
    const files = new Map<string, string>([
      ['/project/importmap.client.json', '{"imports":{}}'],
      [
        '/project/routemap.server.json',
        '{"routes":[{"module":"./routes/index.ts","pathname":"/"}]}',
      ],
    ]);
    const host = createRouterPluginHost({
      readFile: async (file: string) => {
        const data = files.get(file);
        if (!data) {
          throw new Error(`missing: ${file}`);
        }
        return data;
      },
    });

    host.initialize({
      resolvedWebRouterConfig: createTestConfig('/project'),
    } as any);

    await expect(host.api.clientImportmap()).resolves.toEqual({ imports: {} });
    await expect(host.api.serverRoutemap()).resolves.toEqual({
      routes: [{ module: './routes/index.ts', pathname: '/' }],
    });
  });

  test('returns in-memory routemap during dev when cache is set', async () => {
    const host = createRouterPluginHost({
      readFile: async () => {
        throw new Error('readFile should not be called');
      },
    });

    host.initialize({
      dev: true,
      resolvedWebRouterConfig: createTestConfig('/project'),
    } as any);

    host.setDevServerRoutemap({
      routes: [{ module: './routes/dev@route.tsx', pathname: '/dev' }],
    });

    await expect(host.api.serverRoutemap()).resolves.toEqual({
      routes: [{ module: './routes/dev@route.tsx', pathname: '/dev' }],
    });
  });

  test('throws when host is not initialized', () => {
    const host = createRouterPluginHost();
    expect(() => host.api.config).toThrow(
      'Web Router plugin is not initialized.'
    );
  });

  test('getRouteAssetCaches lazily creates and reuses a single instance', () => {
    const host = createRouterPluginHost();
    const caches1 = host.api.getRouteAssetCaches();
    expect(caches1).toBe(host.api.getRouteAssetCaches());
    expect(caches1.source).toBeInstanceOf(Map);
  });
});
