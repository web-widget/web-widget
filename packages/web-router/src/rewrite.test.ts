import { describe, expect, test } from 'vitest';
import { Context } from './context';
import {
  filterHandlersForRewrite,
  getRewriteState,
  hasExplicitSearch,
  pushRewriteDestination,
  popRewriteDestination,
  resolveRewriteDestination,
  rewritePathKey,
} from './rewrite';
import type { MiddlewareHandler } from './types';

describe('rewrite utilities', () => {
  describe('resolveRewriteDestination', () => {
    const request = new Request('http://localhost/v1/foo?bar=1');

    test('preserves query when destination has no search', () => {
      const url = resolveRewriteDestination('/internal/foo', request);
      expect(url.pathname).toBe('/internal/foo');
      expect(url.search).toBe('?bar=1');
    });

    test('uses explicit query from destination string', () => {
      const url = resolveRewriteDestination('/internal/foo?baz=2', request);
      expect(url.search).toBe('?baz=2');
    });

    test('uses explicit query from URL object', () => {
      const url = resolveRewriteDestination(
        new URL('/internal/foo?baz=2', request.url),
        request
      );
      expect(url.search).toBe('?baz=2');
    });

    test('rejects cross-origin destination', () => {
      expect(() =>
        resolveRewriteDestination('https://evil.test/internal', request)
      ).toThrow(/same-origin/i);
    });
  });

  describe('hasExplicitSearch', () => {
    test('detects query in string', () => {
      expect(hasExplicitSearch('/a')).toBe(false);
      expect(hasExplicitSearch('/a?x=1')).toBe(true);
    });

    test('detects query on URL', () => {
      expect(hasExplicitSearch(new URL('http://localhost/a'))).toBe(false);
      expect(hasExplicitSearch(new URL('http://localhost/a?q=1'))).toBe(true);
    });
  });

  describe('rewritePathKey', () => {
    test('includes pathname and search', () => {
      expect(rewritePathKey(new URL('http://localhost/internal?x=1'))).toBe(
        '/internal?x=1'
      );
    });
  });

  describe('pushRewriteDestination / popRewriteDestination', () => {
    test('detects loops with visited set', () => {
      const state = getRewriteState(
        new Context(new Request('http://localhost/'))
      );
      pushRewriteDestination(state, '/a');
      pushRewriteDestination(state, '/b');
      expect(() => pushRewriteDestination(state, '/a')).toThrow(/loop/i);
      popRewriteDestination(state);
      popRewriteDestination(state);
      pushRewriteDestination(state, '/a');
      expect(state._rewriteVisited.has('/a')).toBe(true);
    });
  });

  describe('filterHandlersForRewrite', () => {
    test('skips executed global (*) handlers only', () => {
      const state = getRewriteState(
        new Context(new Request('http://localhost/'))
      );
      const global: MiddlewareHandler = async () => new Response();
      const scoped: MiddlewareHandler = async () => new Response();
      state._initialExecutedHandlers.add(global);
      state._hasRecordedInitialHandlers = true;

      const filtered = filterHandlersForRewrite(
        [
          [global, {}, '*'],
          [scoped, {}, '/api'],
        ],
        state
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0][0]).toBe(scoped);
    });
  });
});
