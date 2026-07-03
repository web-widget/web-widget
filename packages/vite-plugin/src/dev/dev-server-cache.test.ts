import { describe, expect, test } from '@jest/globals';
import {
  bumpDevServerRevision,
  getDevServerRevision,
  resetDevServerRevisionForTests,
} from './dev-server-cache';

describe('dev-server-cache', () => {
  test('bumps monotonic revision for WebRouter cache busting', () => {
    resetDevServerRevisionForTests();
    expect(getDevServerRevision()).toBe(0);
    bumpDevServerRevision();
    expect(getDevServerRevision()).toBe(1);
    bumpDevServerRevision();
    expect(getDevServerRevision()).toBe(2);
  });
});
