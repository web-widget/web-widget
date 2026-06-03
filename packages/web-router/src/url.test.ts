import {
  getPathForRequest,
  getPathForUrl,
  getPathNoStrictForRequest,
  getPathNoStrictForUrl,
  getQueryStringForHref,
} from './url';

describe('url', () => {
  describe('getPathForRequest', () => {
    test('no trailing slash', () => {
      let path = getPathForRequest(new Request('https://example.com/'));
      expect(path).toBe('/');
      path = getPathForRequest(new Request('https://example.com/hello'));
      expect(path).toBe('/hello');
      path = getPathForRequest(new Request('https://example.com/hello/hey'));
      expect(path).toBe('/hello/hey');
      path = getPathForRequest(
        new Request('https://example.com/hello?name=foo')
      );
      expect(path).toBe('/hello');
      path = getPathForRequest(
        new Request('https://example.com/hello/hey?name=foo&name=bar')
      );
      expect(path).toBe('/hello/hey');
    });

    test('with trailing slash', () => {
      let path = getPathForRequest(new Request('https://example.com/hello/'));
      expect(path).toBe('/hello/');
      path = getPathForRequest(new Request('https://example.com/hello/hey/'));
      expect(path).toBe('/hello/hey/');
    });
  });

  describe('getQueryStringForHref', () => {
    test('extracts search from href', () => {
      let qs = getQueryStringForHref(
        'https://example.com/hello?name=foo&name=bar&age=20'
      );
      expect(qs).toBe('?name=foo&name=bar&age=20');
      qs = getQueryStringForHref('https://example.com/hello?');
      expect(qs).toBe('?');
      qs = getQueryStringForHref('https://example.com/hello');
      expect(qs).toBe('');
      qs = getQueryStringForHref(
        'https://example.com/hello?name=foo&name=bar&age=20#hash'
      );
      expect(qs).toBe('?name=foo&name=bar&age=20#hash');
    });
  });

  describe('getPathForUrl', () => {
    test('matches getPathForRequest for the same URL', () => {
      const url = new URL('https://example.com/hello/hey?name=foo');
      expect(getPathForUrl(url)).toBe(
        getPathForRequest(new Request('https://example.com/hello/hey?name=foo'))
      );
    });

    test('getPathNoStrictForUrl strips trailing slash', () => {
      expect(getPathNoStrictForUrl(new URL('https://example.com/hello/'))).toBe(
        '/hello'
      );
    });
  });

  describe('getPathNoStrictForRequest', () => {
    test('strips trailing slash when strict is false', () => {
      let path = getPathNoStrictForRequest(
        new Request('https://example.com/hello/')
      );
      expect(path).toBe('/hello');
      path = getPathNoStrictForRequest(
        new Request('https://example.com/hello/hey/')
      );
      expect(path).toBe('/hello/hey');
    });

    test('returns `/` for root', () => {
      const path = getPathNoStrictForRequest(
        new Request('https://example.com/')
      );
      expect(path).toBe('/');
    });
  });
});
