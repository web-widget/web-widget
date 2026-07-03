import { describe, expect, test } from '@jest/globals';
import type { ViteDevServer } from 'vite';
import { resolveDevOrigin, resolvePreviewOrigin } from './resolve-dev-origin';

function mockViteServer(config: {
  server: Record<string, unknown>;
  preview: Record<string, unknown>;
  resolvedUrls?: ViteDevServer['resolvedUrls'];
}): ViteDevServer {
  return {
    config,
    resolvedUrls: config.resolvedUrls ?? null,
  } as unknown as ViteDevServer;
}

describe('resolveDevOrigin', () => {
  test('prefers config.server.origin', () => {
    expect(
      resolveDevOrigin(
        mockViteServer({
          server: {
            origin: 'https://dev.example.com/app',
            host: 'localhost',
            port: 5173,
          },
          preview: { host: 'localhost', port: 4173 },
          resolvedUrls: {
            local: ['http://127.0.0.1:5173/'],
            network: [],
          },
        })
      )
    ).toBe('https://dev.example.com');
  });

  test('uses resolvedUrls when server.origin is unset', () => {
    expect(
      resolveDevOrigin(
        mockViteServer({
          server: { https: {}, host: 'localhost', port: 5173 },
          preview: { host: 'localhost', port: 4173 },
          resolvedUrls: {
            local: ['https://127.0.0.1:5173/'],
            network: [],
          },
        })
      )
    ).toBe('https://127.0.0.1:5173');
  });

  test('falls back to config.server instead of preview', () => {
    expect(
      resolveDevOrigin(
        mockViteServer({
          server: { https: {}, host: 'localhost', port: 51205 },
          preview: { host: 'localhost', port: 4173 },
        })
      )
    ).toBe('https://localhost:51205');
  });
});

describe('resolvePreviewOrigin', () => {
  test('falls back to config.preview', () => {
    expect(
      resolvePreviewOrigin(
        mockViteServer({
          server: { https: {}, host: 'localhost', port: 5173 },
          preview: { host: 'localhost', port: 4173 },
        })
      )
    ).toBe('http://localhost:4173');
  });
});
