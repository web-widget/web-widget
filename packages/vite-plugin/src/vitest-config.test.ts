import type { ConfigEnv } from 'vite';
import { describe, expect, it, afterEach } from '@jest/globals';
import { mergeRouterVitestConfig } from './vitest-config';

describe('mergeRouterVitestConfig', () => {
  const env = { command: 'serve', mode: 'test' } as ConfigEnv;

  afterEach(() => {
    delete process.env.VITEST;
  });

  it('returns undefined outside Vitest when user test config is absent', () => {
    expect(
      mergeRouterVitestConfig(undefined, 'webworker', {
        command: 'build',
        mode: 'production',
      })
    ).toBeUndefined();
  });

  it('injects node setup during Vitest even without user test config', () => {
    process.env.VITEST = 'true';

    expect(mergeRouterVitestConfig(undefined, 'node', env)).toEqual({
      environment: 'node',
      setupFiles: ['@web-widget/vite-plugin/vitest-node-environment'],
    });
  });

  it('injects edge-runtime setup for webworker server target', () => {
    process.env.VITEST = 'true';

    expect(mergeRouterVitestConfig(undefined, 'webworker', env)).toEqual({
      environment: 'edge-runtime',
      setupFiles: ['@web-widget/vite-plugin/vitest-edge-runtime-environment'],
    });
  });

  it('merges user setupFiles with injected setup', () => {
    process.env.VITEST = 'true';

    expect(
      mergeRouterVitestConfig(
        { setupFiles: ['./custom-setup.ts'] },
        'node',
        env
      )
    ).toEqual({
      environment: 'node',
      setupFiles: [
        './custom-setup.ts',
        '@web-widget/vite-plugin/vitest-node-environment',
      ],
    });
  });

  it('leaves custom test pools untouched', () => {
    process.env.VITEST = 'true';
    const userTest = { pool: 'forks' as const, environment: 'jsdom' as const };

    expect(mergeRouterVitestConfig(userTest, 'node', env)).toBe(userTest);
  });
});
