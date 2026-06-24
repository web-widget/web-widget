import { describe, expect, test } from '@jest/globals';
import {
  bumpDevServerRevision,
  getDevServerRevision,
  resetDevServerRevisionForTests,
} from './dev-server-cache';
import {
  clearMetaCacheForTests,
  getCachedMeta,
  setCachedMeta,
} from './meta-cache';

describe('dev-server-cache', () => {
  test('bumps monotonic revision', () => {
    resetDevServerRevisionForTests();
    expect(getDevServerRevision()).toBe(0);
    bumpDevServerRevision();
    expect(getDevServerRevision()).toBe(1);
    bumpDevServerRevision();
    expect(getDevServerRevision()).toBe(2);
  });
});

describe('meta-cache', () => {
  test('returns cached meta only for matching revision', () => {
    clearMetaCacheForTests();
    const meta = { link: [], style: [], script: [] };
    setCachedMeta('/src/page.tsx', 1, meta);

    expect(getCachedMeta('/src/page.tsx', 1)).toEqual(meta);
    expect(getCachedMeta('/src/page.tsx', 2)).toBeUndefined();
    expect(getCachedMeta('/other.tsx', 1)).toBeUndefined();
  });
});
