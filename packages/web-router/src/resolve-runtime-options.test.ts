import { describe, expect, test } from 'vitest';
import { resolveRuntimeOptions } from './resolve-runtime-options';

describe('resolveRuntimeOptions', () => {
  test('prod defaults when dev is unset', () => {
    expect(resolveRuntimeOptions({ manifest: {} })).toEqual({
      exposeErrors: false,
      progressive: false,
      moduleSource: undefined,
    });
  });

  test('dev: true applies dev defaults', () => {
    expect(resolveRuntimeOptions({ manifest: { dev: true } })).toEqual({
      exposeErrors: true,
      progressive: false,
      moduleSource: undefined,
    });
  });

  test('dev object overrides dev defaults', () => {
    expect(
      resolveRuntimeOptions({
        manifest: {
          dev: {
            exposeErrors: false,
            progressive: true,
          },
        },
      })
    ).toEqual({
      exposeErrors: false,
      progressive: true,
      moduleSource: undefined,
    });
  });

  test('options.dev overrides manifest.dev', () => {
    expect(
      resolveRuntimeOptions({
        manifest: { dev: false },
        dev: true,
      })
    ).toEqual({
      exposeErrors: true,
      progressive: false,
      moduleSource: undefined,
    });
  });

  test('dev object can provide moduleSource for tooling', () => {
    const moduleSource = () => '/routes/index@route.tsx';
    expect(
      resolveRuntimeOptions({
        manifest: { dev: { moduleSource } },
      })
    ).toEqual({
      exposeErrors: true,
      progressive: false,
      moduleSource,
    });
  });
});
