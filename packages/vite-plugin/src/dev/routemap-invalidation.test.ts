import { jest } from '@jest/globals';
import { handleDevRoutemapChange } from './routemap-invalidation';
import type { ResolvedWebRouterConfig } from '@/types';

describe('handleDevRoutemapChange', () => {
  const config = {
    input: {
      server: {
        entry: '/project/entry.server.ts',
        routemap: '/project/routemap.server.json',
      },
    },
  } as ResolvedWebRouterConfig;

  function createServer() {
    const invalidateModule = jest.fn();
    const info = jest.fn();
    const send = jest.fn();
    const entry = { id: 'entry' };
    const server = {
      config: { root: '/project' },
      environments: {
        ssr: {
          logger: { info },
          moduleGraph: {
            getModulesByFile(file: string) {
              return file === config.input.server.entry
                ? new Set([entry])
                : undefined;
            },
            invalidateModule,
          },
        },
        client: { hot: { send } },
      },
    } as any;
    return { server, invalidateModule, info, send, entry };
  }

  test('invalidates server modules without reloading for a non-structural change', async () => {
    const { server, invalidateModule, info, send, entry } = createServer();

    await handleDevRoutemapChange(server, config, {
      structural: false,
      filesystemChanged: false,
    });

    expect(invalidateModule).toHaveBeenCalledWith(
      entry,
      expect.any(Set),
      expect.any(Number),
      true
    );
    expect(info).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  test.each([
    { structural: true, filesystemChanged: false },
    { structural: false, filesystemChanged: true },
  ])(
    'reloads the client for $structural/$filesystemChanged',
    async (options) => {
      const { server, info, send } = createServer();

      await handleDevRoutemapChange(server, config, options);

      expect(info).toHaveBeenCalledWith('page reload', { timestamp: true });
      expect(send).toHaveBeenCalledWith({ type: 'full-reload' });
    }
  );
});
