import { renderLifecycleCacheLayer } from './server';
import { lifecycleCache } from './cache';
import { LIFECYCLE_CACHE_LAYER } from './constants';

test('should render the cache', async () => {
  const state = {};
  const cache = lifecycleCache<{
    number?: number;
    string?: string;
    numberArray?: number[];
    stringArray?: string[];
  }>(state);

  cache.set('number', 1, true);
  expect(renderLifecycleCacheLayer(state)).toBe(
    `<script>(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push({"number":1})</script>`
  );

  cache.set('string', 'a', true);
  expect(renderLifecycleCacheLayer(state)).toBe(
    `<script>(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push({"string":"a"})</script>`
  );

  cache.set('numberArray', [1, 2, 3], true);
  expect(renderLifecycleCacheLayer(state)).toBe(
    `<script>(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push({"numberArray":[1,2,3]})</script>`
  );

  cache.set('stringArray', ['a', 'b', 'c'], true);
  expect(renderLifecycleCacheLayer(state)).toBe(
    `<script>(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push({"stringArray":["a","b","c"]})</script>`
  );

  expect(renderLifecycleCacheLayer(state)).toBe('');
  expect(cache.get('number')).toBe(1);
  expect(cache.get('string')).toBe('a');
  expect(cache.get('numberArray')).toStrictEqual([1, 2, 3]);
  expect(cache.get('stringArray')).toStrictEqual(['a', 'b', 'c']);
});
