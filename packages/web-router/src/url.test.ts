import { getPath, getPathNoStrict, mergePath, getQueryStrings } from './url';

describe('url', () => {
  describe('getPath', () => {
    test('getPath - no trailing slash', () => {
      let path = getPath(new Request('https://example.com/'));
      expect(path).toBe('/');
      path = getPath(new Request('https://example.com/hello'));
      expect(path).toBe('/hello');
      path = getPath(new Request('https://example.com/hello/hey'));
      expect(path).toBe('/hello/hey');
      path = getPath(new Request('https://example.com/hello?name=foo'));
      expect(path).toBe('/hello');
      path = getPath(
        new Request('https://example.com/hello/hey?name=foo&name=bar')
      );
      expect(path).toBe('/hello/hey');
    });

    test('getPath - with trailing slash', () => {
      let path = getPath(new Request('https://example.com/hello/'));
      expect(path).toBe('/hello/');
      path = getPath(new Request('https://example.com/hello/hey/'));
      expect(path).toBe('/hello/hey/');
    });
  });

  describe('getQueryStrings', () => {
    test('getQueryStrings', () => {
      let qs = getQueryStrings(
        'https://example.com/hello?name=foo&name=bar&age=20'
      );
      expect(qs).toBe('?name=foo&name=bar&age=20');
      qs = getQueryStrings('https://example.com/hello?');
      expect(qs).toBe('?');
      qs = getQueryStrings('https://example.com/hello');
      expect(qs).toBe('');
      // Allows to contain hash
      qs = getQueryStrings(
        'https://example.com/hello?name=foo&name=bar&age=20#hash'
      );
      expect(qs).toBe('?name=foo&name=bar&age=20#hash');
    });
  });

  describe('getPathNoStrict', () => {
    test('getPathNoStrict - no strict is false', () => {
      let path = getPathNoStrict(new Request('https://example.com/hello/'));
      expect(path).toBe('/hello');
      path = getPathNoStrict(new Request('https://example.com/hello/hey/'));
      expect(path).toBe('/hello/hey');
    });

    test('getPathNoStrict - return `/` even if strict is false', () => {
      const path = getPathNoStrict(new Request('https://example.com/'));
      expect(path).toBe('/');
    });
  });

  describe('mergePath', () => {
    test('mergePath', () => {
      expect(mergePath('/book', '/')).toBe('/book');
      expect(mergePath('/book/', '/')).toBe('/book/');
      expect(mergePath('/book', '/hey')).toBe('/book/hey');
      expect(mergePath('/book/', '/hey')).toBe('/book/hey');
      expect(mergePath('/book', '/hey/')).toBe('/book/hey/');
      expect(mergePath('/book/', '/hey/')).toBe('/book/hey/');
      expect(mergePath('/book', 'hey', 'say')).toBe('/book/hey/say');
      expect(mergePath('/book', '/hey/', '/say/')).toBe('/book/hey/say/');
      expect(mergePath('/book', '/hey/', '/say/', '/')).toBe('/book/hey/say/');

      expect(mergePath('book', '/')).toBe('/book');
      expect(mergePath('book/', '/')).toBe('/book/');
      expect(mergePath('book', '/hey')).toBe('/book/hey');
      expect(mergePath('book', 'hey')).toBe('/book/hey');
      expect(mergePath('book', 'hey/')).toBe('/book/hey/');
    });
    test('Should be `/book`', () => {
      expect(mergePath('/', 'book')).toBe('/book');
    });
    test('Should be `/book`', () => {
      expect(mergePath('/', '/book')).toBe('/book');
    });
    test('Should be `/`', () => {
      expect(mergePath('/', '/')).toBe('/');
    });
  });
});
