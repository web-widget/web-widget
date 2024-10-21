import {
  cacheProvider,
  callSyncCacheProvider,
  syncCacheProvider,
} from './provider';
import { LifecycleCache } from './cache';

let id = 0;
const createCacheKey = () => `cacheKey:${id++}`;
function composeCacheKey(cacheKey: string, args?: any[]): string {
  cacheKey = `^${cacheKey}`;
  return args?.length ? `${cacheKey}#${JSON.stringify(args)}` : cacheKey;
}

const mockCache = new LifecycleCache<any>({});
function getMockCache(cacheKey: string, args?: any[]) {
  return mockCache.get(composeCacheKey(cacheKey, args));
}

describe('cacheProvider', () => {
  test('should return cached value if available', async () => {
    const cacheKey = createCacheKey();
    const cachedValue = 'cachedValue';
    mockCache.set(cacheKey, cachedValue);

    const result = await cacheProvider(
      cacheKey,
      async () => 'newValue',
      undefined,
      { cache: mockCache }
    );
    expect(result).toBe(cachedValue);
  });

  test('should call handler and cache the result if not cached', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(
      cacheKey,
      async () => 'newValue',
      undefined,
      { cache: mockCache }
    );
    expect(result).toBe('newValue');
    expect(getMockCache(cacheKey)).toBe('newValue');
  });

  test('the parameters should be passed to the handler', async () => {
    const cacheKey = createCacheKey();
    const args1 = ['arg1', 'arg2'];
    const args2 = ['arg3', 'arg4'];

    const fn = async (args: string[]) =>
      cacheProvider(
        cacheKey,
        async (...handlerArgs: string[]) => handlerArgs.join(' '),
        args,
        { cache: mockCache }
      );

    const result1 = await fn(args1);
    expect(result1).toBe(args1.join(' '));
    expect(getMockCache(cacheKey, args1)).toBe(args1.join(' '));

    const result2 = await fn(args2);
    expect(result2).toBe(args2.join(' '));
    expect(getMockCache(cacheKey, args2)).toBe(args2.join(' '));
  });

  test('should throw an error if handler is not provided', async () => {
    const cacheKey = createCacheKey();

    await expect(
      cacheProvider(cacheKey, undefined as any, undefined, { cache: mockCache })
    ).rejects.toThrow('Handler is required.');
  });

  test('should throw an error if handler returns null', async () => {
    const cacheKey = createCacheKey();
    await expect(
      cacheProvider(cacheKey, (async () => null) as any, undefined, {
        cache: mockCache,
      })
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should throw an error if handler returns undefined', async () => {
    const cacheKey = createCacheKey();
    await expect(
      cacheProvider(cacheKey, (async () => undefined) as any, undefined, {
        cache: mockCache,
      })
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should be cached if the handler returns empty string', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(cacheKey, () => '', undefined, {
      cache: mockCache,
    });
    expect(result).toBe('');
    expect(getMockCache(cacheKey)).toBe('');
  });

  test('should be cached if the handler returns 0', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(cacheKey, async () => 0, undefined, {
      cache: mockCache,
    });
    expect(result).toBe(0);
    expect(getMockCache(cacheKey)).toBe(0);
  });

  test('should handle sync handler', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(
      cacheKey,
      () => Promise.resolve('syncValue'),
      undefined,
      { cache: mockCache }
    );
    expect(result).toBe('syncValue');
    expect(getMockCache(cacheKey)).toBe('syncValue');
  });
});

describe('syncCacheProvider', () => {
  test('should return cached value if available', async () => {
    const cacheKey = createCacheKey();
    const cachedValue = 'cachedValue';
    mockCache.set(cacheKey, cachedValue);

    const result = await callSyncCacheProvider(() =>
      syncCacheProvider(cacheKey, async () => 'newValue', undefined, {
        cache: mockCache,
      })
    );
    expect(result).toBe(cachedValue);
  });

  test('should call handler and cache the result if not cached', async () => {
    const cacheKey = createCacheKey();

    const result = await callSyncCacheProvider(() =>
      syncCacheProvider(cacheKey, async () => 'newValue', undefined, {
        cache: mockCache,
      })
    );
    expect(result).toBe('newValue');
    expect(getMockCache(cacheKey)).toBe('newValue');
  });

  test('the parameters should be passed to the handler', async () => {
    const cacheKey = createCacheKey();
    const args1 = ['arg1', 'arg2'];
    const args2 = ['arg3', 'arg4'];

    const fn = async (args: string[]) =>
      syncCacheProvider(
        cacheKey,
        async (...handlerArgs: string[]) => handlerArgs.join(' '),
        args,
        { cache: mockCache }
      );

    const result1 = await callSyncCacheProvider(() => fn(args1));
    expect(result1).toBe(args1.join(' '));
    expect(getMockCache(cacheKey, args1)).toBe(args1.join(' '));

    const result2 = await callSyncCacheProvider(() => fn(args2));
    expect(result2).toBe(args2.join(' '));
    expect(getMockCache(cacheKey, args2)).toBe(args2.join(' '));
  });

  test('should throw an error if handler is not provided', async () => {
    const cacheKey = createCacheKey();

    await expect(
      callSyncCacheProvider(() =>
        syncCacheProvider(cacheKey, undefined as any, undefined, {
          cache: mockCache,
        })
      )
    ).rejects.toThrow('Handler is required.');
  });

  test('should throw an error if handler returns null', async () => {
    const cacheKey = createCacheKey();
    await expect(
      callSyncCacheProvider(() =>
        syncCacheProvider(cacheKey, (async () => null) as any, undefined, {
          cache: mockCache,
        })
      )
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should throw an error if handler returns undefined', async () => {
    const cacheKey = createCacheKey();
    await expect(
      callSyncCacheProvider(() =>
        syncCacheProvider(cacheKey, (async () => undefined) as any, undefined, {
          cache: mockCache,
        })
      )
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should be cached if the handler returns empty string', async () => {
    const cacheKey = createCacheKey();

    const result = await callSyncCacheProvider(() =>
      syncCacheProvider(cacheKey, () => '', undefined, { cache: mockCache })
    );
    expect(result).toBe('');
    expect(getMockCache(cacheKey)).toBe('');
  });

  test('should be cached if the handler returns 0', async () => {
    const cacheKey = createCacheKey();

    const result = await callSyncCacheProvider(() =>
      syncCacheProvider(cacheKey, async () => 0, undefined, {
        cache: mockCache,
      })
    );
    expect(result).toBe(0);
    expect(getMockCache(cacheKey)).toBe(0);
  });

  test('should handle sync handler', async () => {
    const cacheKey = createCacheKey();

    const result = await callSyncCacheProvider(() =>
      syncCacheProvider(
        cacheKey,
        () => Promise.resolve('syncValue'),
        undefined,
        { cache: mockCache }
      )
    );
    expect(result).toBe('syncValue');
    expect(getMockCache(cacheKey)).toBe('syncValue');
  });
});
