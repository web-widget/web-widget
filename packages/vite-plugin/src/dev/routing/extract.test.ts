import { pathToPattern, sortRoutePaths } from './extract';

describe('pathToPattern', () => {
  test('creates pattern', () => {
    expect(pathToPattern('foo/bar')).toEqual('/foo/bar');
  });

  test('parses index routes', () => {
    expect(pathToPattern('foo/index')).toEqual('/foo');
  });

  test('parses parameters', () => {
    expect(pathToPattern('foo/[name]')).toEqual('/foo/:name');
    expect(pathToPattern('foo/[name]/bar/[bob]')).toEqual(
      '/foo/:name/bar/:bob'
    );
  });

  test('parses catchall', () => {
    expect(pathToPattern('foo/[...name]')).toEqual('/foo/:name*');
  });

  test('parses multiple params in same part', () => {
    expect(pathToPattern('foo/[mod]@[version]')).toEqual('/foo/:mod@:version');
    expect(pathToPattern('foo/[bar].json')).toEqual('/foo/:bar.json');
    expect(pathToPattern('foo/foo[bar]')).toEqual('/foo/foo:bar');
  });

  test('parses optional params', () => {
    expect(pathToPattern('foo/[[name]]')).toEqual('/foo{/:name}?');
    expect(pathToPattern('foo/[name]/[[bob]]')).toEqual('/foo/:name{/:bob}?');
    expect(pathToPattern('foo/[[name]]/bar')).toEqual('/foo{/:name}?/bar');
    expect(pathToPattern('foo/[[name]]/bar/[[bob]]')).toEqual(
      '/foo{/:name}?/bar{/:bob}?'
    );
    expect(pathToPattern('(group)/[[name]]/(group2)/index')).toEqual(
      '/{:name}?'
    );
  });

  test('throws on invalid patterns', () => {
    expect(() => pathToPattern('foo/[foo][bar]')).toThrow();
    expect(() => pathToPattern('foo/foo]')).toThrow();
    expect(() => pathToPattern('foo/[foo]]')).toThrow();
    expect(() => pathToPattern('foo/foo-[[name]]-bar/baz')).toThrow();
    expect(() => pathToPattern('foo/[[name]]-bar/baz')).toThrow();
    expect(() => pathToPattern('foo/foo-[[name]]/baz')).toThrow();
    expect(() => pathToPattern('foo/foo-[[name]]')).toThrow();
    expect(() => pathToPattern('foo/[[name]]-bar')).toThrow();
  });

  test('keep groups', () => {
    expect(pathToPattern('foo/(foo)/bar', { keepGroups: true })).toEqual(
      '/foo/(foo)/bar'
    );
  });
});

describe('sortRoutePaths', () => {
  test('fsRoutes - sortRoutePaths', () => {
    let routes = [
      '/foo/[id]',
      '/foo/[...slug]',
      '/foo/bar/:name',
      '/foo/bar',
      '/foo/_layout',
      '/foo/index',
      '/foo/_middleware',
      '/foo/bar/_middleware',
      '/foo/_error',
      '/foo/bar/index',
      '/foo/bar/_error',
      '/_error',
      '/foo/bar/[...foo]',
      '/foo/bar/baz',
      '/foo/bar/_layout',
    ];
    let sorted = [
      '/_error',
      '/foo/_error',
      '/foo/_layout',
      '/foo/_middleware',
      '/foo/index',
      '/foo/bar',
      '/foo/bar/_error',
      '/foo/bar/_layout',
      '/foo/bar/_middleware',
      '/foo/bar/index',
      '/foo/bar/baz',
      '/foo/bar/:name',
      '/foo/bar/[...foo]',
      '/foo/[id]',
      '/foo/[...slug]',
    ];
    routes.sort(sortRoutePaths);
    expect(routes).toEqual(sorted);

    routes = [
      '/js/index.js',
      '/js/_layout.js',
      '/jsx/index.jsx',
      '/jsx/_layout.jsx',
      '/ts/index.ts',
      '/ts/_layout.tsx',
      '/tsx/index.tsx',
      '/tsx/_layout.tsx',
    ];
    routes.sort(sortRoutePaths);
    sorted = [
      '/js/_layout.js',
      '/js/index.js',
      '/jsx/_layout.jsx',
      '/jsx/index.jsx',
      '/ts/_layout.tsx',
      '/ts/index.ts',
      '/tsx/_layout.tsx',
      '/tsx/index.tsx',
    ];
    expect(routes).toEqual(sorted);

    // Skip over groups
    routes = ['/(app)/[org]/[app]/index.ts', '/auth/login.ts'];
    routes.sort(sortRoutePaths);
    sorted = ['/auth/login.ts', '/(app)/[org]/[app]/index.ts'];
    expect(routes).toEqual(sorted);

    routes = ['/auth/login.ts', '/(app)/[org]/[app]/index.ts'];
    routes.sort(sortRoutePaths);
    sorted = ['/auth/login.ts', '/(app)/[org]/[app]/index.ts'];
    expect(routes).toEqual(sorted);
  });

  test('fsRoutes - sortRoutePaths with groups', () => {
    let routes = [
      '/(authed)/_middleware.ts',
      '/(authed)/index.ts',
      '/about.tsx',
    ];
    routes.sort(sortRoutePaths);
    let sorted = [
      '/about.tsx',
      '/(authed)/_middleware.ts',
      '/(authed)/index.ts',
    ];
    expect(routes).toEqual(sorted);

    routes = [
      '/_app',
      '/(authed)/_middleware',
      '/(authed)/_layout',
      '/_error',
      '/(authed)/index',
      '/login',
      '/auth/login',
      '/auth/logout',
      '/(authed)/(account)/account',
      '/(authed)/api/slug',
      '/hooks/github',
      '/(authed)/[org]/_middleware',
      '/(authed)/[org]/index',
    ];
    routes.sort(sortRoutePaths);
    sorted = [
      '/_app',
      '/_error',
      '/auth/login',
      '/auth/logout',
      '/hooks/github',
      '/login',
      '/(authed)/_layout',
      '/(authed)/_middleware',
      '/(authed)/index',
      '/(authed)/api/slug',
      '/(authed)/(account)/account',
      '/(authed)/[org]/_middleware',
      '/(authed)/[org]/index',
    ];
    expect(routes).toEqual(sorted);
  });
});
