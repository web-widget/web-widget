import { cacheProvider, syncCacheProvider } from './provider';
import { LifecycleCache } from './cache';

let id = 0;
const createCacheKey = () => `cacheKey:${id++}`;

const mockCache = new LifecycleCache<any>({});
async function suspense<T>(handler: () => T) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof Promise) {
      await error;
      return suspense(handler);
    } else {
      throw error;
    }
  }
}

describe('cacheProvider', () => {
  test('should return cached value if available', async () => {
    const cacheKey = createCacheKey();
    const cachedValue = 'cachedValue';
    mockCache.set(cacheKey, cachedValue);

    const result = await cacheProvider(
      cacheKey,
      async () => 'newValue',
      [],
      mockCache
    );
    expect(result).toBe(cachedValue);
  });

  test('should call handler and cache the result if not cached', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(
      cacheKey,
      async () => 'newValue',
      [],
      mockCache
    );
    expect(result).toBe('newValue');
    expect(mockCache.get(cacheKey)).toBe('newValue');
  });

  test('the parameters should be passed to the handler', async () => {
    const cacheKey = createCacheKey();
    const args = ['arg1', 'arg2'];

    const result = await cacheProvider(
      cacheKey,
      async (...handlerArgs: string[]) => handlerArgs.join(' '),
      args,
      mockCache
    );
    expect(result).toBe(args.join(' '));
    expect(mockCache.get(cacheKey)).toBe(args.join(' '));
  });

  test('should throw an error if handler is not provided', async () => {
    const cacheKey = createCacheKey();

    await expect(
      cacheProvider(cacheKey, undefined as any, [], mockCache)
    ).rejects.toThrow('Handler is required.');
  });

  test('should throw an error if handler returns null', async () => {
    const cacheKey = createCacheKey();
    await expect(
      cacheProvider(cacheKey, (async () => null) as any, [], mockCache)
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should throw an error if handler returns undefined', async () => {
    const cacheKey = createCacheKey();
    await expect(
      cacheProvider(cacheKey, (async () => undefined) as any, [], mockCache)
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should be cached if the handler returns empty string', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(cacheKey, () => '', [], mockCache);
    expect(result).toBe('');
    expect(mockCache.get(cacheKey)).toBe('');
  });

  test('should be cached if the handler returns 0', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(cacheKey, async () => 0, [], mockCache);
    expect(result).toBe(0);
    expect(mockCache.get(cacheKey)).toBe(0);
  });

  test('should handle sync handler', async () => {
    const cacheKey = createCacheKey();

    const result = await cacheProvider(
      cacheKey,
      () => Promise.resolve('syncValue'),
      [],
      mockCache
    );
    expect(result).toBe('syncValue');
    expect(mockCache.get(cacheKey)).toBe('syncValue');
  });
});

describe('syncCacheProvider', () => {
  test('should return cached value if available', async () => {
    const cacheKey = createCacheKey();
    const cachedValue = 'cachedValue';
    mockCache.set(cacheKey, cachedValue);

    const result = await suspense(() =>
      syncCacheProvider(cacheKey, async () => 'newValue', [], mockCache)
    );
    expect(result).toBe(cachedValue);
  });

  test('should call handler and cache the result if not cached', async () => {
    const cacheKey = createCacheKey();

    const result = await suspense(() =>
      syncCacheProvider(cacheKey, async () => 'newValue', [], mockCache)
    );
    expect(result).toBe('newValue');
    expect(mockCache.get(cacheKey)).toBe('newValue');
  });

  test('the parameters should be passed to the handler', async () => {
    const cacheKey = createCacheKey();
    const args = ['arg1', 'arg2'];

    const result = await suspense(() =>
      syncCacheProvider(
        cacheKey,
        async (...handlerArgs: string[]) => handlerArgs.join(' '),
        args,
        mockCache
      )
    );
    expect(result).toBe(args.join(' '));
    expect(mockCache.get(cacheKey)).toBe(args.join(' '));
  });

  test('should throw an error if handler is not provided', async () => {
    const cacheKey = createCacheKey();

    await expect(
      suspense(() =>
        syncCacheProvider(cacheKey, undefined as any, [], mockCache)
      )
    ).rejects.toThrow('Handler is required.');
  });

  test('should throw an error if handler returns null', async () => {
    const cacheKey = createCacheKey();
    await expect(
      suspense(() =>
        syncCacheProvider(cacheKey, (async () => null) as any, [], mockCache)
      )
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should throw an error if handler returns undefined', async () => {
    const cacheKey = createCacheKey();
    await expect(
      suspense(() =>
        syncCacheProvider(
          cacheKey,
          (async () => undefined) as any,
          [],
          mockCache
        )
      )
    ).rejects.toThrow('The cached value cannot be null or undefined.');
  });

  test('should be cached if the handler returns empty string', async () => {
    const cacheKey = createCacheKey();

    const result = await suspense(() =>
      syncCacheProvider(cacheKey, () => '', [], mockCache)
    );
    expect(result).toBe('');
    expect(mockCache.get(cacheKey)).toBe('');
  });

  test('should be cached if the handler returns 0', async () => {
    const cacheKey = createCacheKey();

    const result = await suspense(() =>
      syncCacheProvider(cacheKey, async () => 0, [], mockCache)
    );
    expect(result).toBe(0);
    expect(mockCache.get(cacheKey)).toBe(0);
  });

  test('should handle sync handler', async () => {
    const cacheKey = createCacheKey();

    const result = await suspense(() =>
      syncCacheProvider(
        cacheKey,
        () => Promise.resolve('syncValue'),
        [],
        mockCache
      )
    );
    expect(result).toBe('syncValue');
    expect(mockCache.get(cacheKey)).toBe('syncValue');
  });
});
