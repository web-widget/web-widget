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

test('private content should not be exposed', () => {
  const state = {};
  const cache = lifecycleCache<{
    private?: string;
  }>(state);

  cache.set('private', 'private', false);
  expect(renderLifecycleCacheLayer(state)).toBe('');
});

test('XSS content should be filtered', () => {
  const state = {};
  const cache = lifecycleCache<{
    string?: string;
  }>(state);

  cache.set('string', '<script>alert(1)</script>', true);
  expect(renderLifecycleCacheLayer(state)).toBe(
    `<script>(self.${LIFECYCLE_CACHE_LAYER}=self.${LIFECYCLE_CACHE_LAYER}||[]).push({"string":"\\u003cscript\\u003ealert(1)\\u003c/script\\u003e"})</script>`
  );
});
