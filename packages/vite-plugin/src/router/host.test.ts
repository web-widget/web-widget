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

  test('throws when host is not initialized', () => {
    const host = createRouterPluginHost();
    expect(() => host.api.config).toThrow(
      'Web Router plugin is not initialized.'
    );
  });
});
