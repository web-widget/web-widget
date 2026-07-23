import { jest } from '@jest/globals';
import { warmupServerDevModules } from './warmup';
import type { ResolvedWebRouterConfig } from '@/types';

describe('warmupServerDevModules', () => {
  const config = {
    input: {
      server: {
        entry: '/project/entry.server.ts',
        routemap: '/project/routemap.server.json',
      },
    },
  } as ResolvedWebRouterConfig;

  test('warms the server entry and routemap in order', async () => {
    const warmupRequest = jest.fn(async () => undefined);
    const viteServer = {
      environments: { ssr: { warmupRequest } },
    } as any;

    await warmupServerDevModules(viteServer, config);

    expect(warmupRequest.mock.calls).toEqual([
      ['/project/entry.server.ts'],
      ['/project/routemap.server.json'],
    ]);
  });

  test('is a no-op when the environment cannot warm requests', async () => {
    await expect(
      warmupServerDevModules({ environments: { ssr: {} } } as any, config)
    ).resolves.toBeUndefined();
  });
});
