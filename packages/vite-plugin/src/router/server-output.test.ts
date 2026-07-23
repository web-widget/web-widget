import { jest } from '@jest/globals';
import {
  createClientManifestCapturePlugin,
  createServerOutputPlugin,
  runRouterBuildApp,
  runRouterServerBuildApp,
} from './server-output';
import { createRouterPluginHost } from './host';

function environmentContext(
  consumer: 'client' | 'server',
  manifest: boolean | string
) {
  return {
    environment: {
      config: { consumer, build: { manifest } },
    },
  };
}

describe('createClientManifestCapturePlugin', () => {
  function asset(source: string | Uint8Array) {
    return {
      type: 'asset' as const,
      fileName: '.vite/manifest.json',
      names: [],
      originalFileNames: [],
      source,
    };
  }

  test('captures the default manifest from a client bundle', () => {
    const host = createRouterPluginHost();
    const plugin = createClientManifestCapturePlugin(host);
    const generateBundle = plugin.generateBundle as Function;

    generateBundle.call(
      environmentContext('client', true),
      {},
      {
        '.vite/manifest.json': asset('{"entry":{"file":"entry.js"}}'),
      }
    );

    expect(host.state.clientManifest).toEqual({
      entry: { file: 'entry.js' },
    });
  });

  test('captures a binary custom manifest during writeBundle', () => {
    const host = createRouterPluginHost();
    const plugin = createClientManifestCapturePlugin(host);
    const writeBundle = plugin.writeBundle as Function;

    writeBundle.call(
      environmentContext('client', 'meta.json'),
      {},
      {
        'meta.json': asset(
          new TextEncoder().encode('{"entry":{"file":"entry.js"}}')
        ),
      }
    );

    expect(host.state.clientManifest).toEqual({
      entry: { file: 'entry.js' },
    });
  });

  test('does not overwrite a manifest captured by generateBundle', () => {
    const host = createRouterPluginHost();
    host.patchState({ clientManifest: { existing: { file: 'first.js' } } });
    const plugin = createClientManifestCapturePlugin(host);
    const writeBundle = plugin.writeBundle as Function;

    writeBundle.call(
      environmentContext('client', true),
      {},
      {
        '.vite/manifest.json': asset('{"later":{"file":"second.js"}}'),
      }
    );

    expect(host.state.clientManifest).toEqual({
      existing: { file: 'first.js' },
    });
  });

  test('ignores server environments and disabled manifests', () => {
    const host = createRouterPluginHost();
    const plugin = createClientManifestCapturePlugin(host);
    const generateBundle = plugin.generateBundle as Function;
    const bundle = {
      '.vite/manifest.json': asset('{"entry":{"file":"entry.js"}}'),
    };

    generateBundle.call(environmentContext('server', true), {}, bundle);
    generateBundle.call(environmentContext('client', false), {}, bundle);

    expect(host.state.clientManifest).toBeUndefined();
  });
});

describe('router build output', () => {
  test('emits server package metadata only in the server environment', async () => {
    const host = createRouterPluginHost();
    const plugin = createServerOutputPlugin(host);
    const generateBundle = plugin.generateBundle as Function;
    const emitFile = jest.fn();

    await generateBundle.call(
      { ...environmentContext('server', false), emitFile },
      {},
      {}
    );

    expect(emitFile).toHaveBeenCalledTimes(2);
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'index.d.ts' })
    );
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'package.json' })
    );

    emitFile.mockClear();
    await generateBundle.call(
      { ...environmentContext('client', true), emitFile },
      {},
      {}
    );
    expect(emitFile).not.toHaveBeenCalled();
  });

  test('builds server before client', async () => {
    const host = createRouterPluginHost();
    const server = { name: 'ssr' };
    const client = { name: 'client' };
    const build = jest.fn(async () => undefined);
    const builder = {
      environments: { ssr: server, client },
      build,
    } as any;

    await runRouterBuildApp(host, builder);

    expect(build.mock.calls).toEqual([[server], [client]]);
  });

  test('supports server-only builds and rejects missing environments', async () => {
    const host = createRouterPluginHost();
    const server = { name: 'ssr' };
    const build = jest.fn(async () => undefined);

    await runRouterServerBuildApp(host, {
      environments: { ssr: server },
      build,
    } as any);
    expect(build).toHaveBeenCalledWith(server);

    await expect(
      runRouterBuildApp(host, { environments: { ssr: server }, build } as any)
    ).rejects.toThrow('Expected both client and server build environments.');
    await expect(
      runRouterServerBuildApp(host, { environments: {}, build } as any)
    ).rejects.toThrow('Expected Vite server environment');
  });
});
