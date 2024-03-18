import { pathToPattern, sortRoutePaths } from './extract';

test('creates pattern', () => {
  expect(pathToPattern('foo/bar')).toBe('/foo/bar');
});

test('parses index routes', () => {
  expect(pathToPattern('foo/index')).toBe('/foo');
});

test('parses parameters', () => {
  expect(pathToPattern('foo/[name]')).toBe('/foo/:name');
  expect(pathToPattern('foo/[name]/bar/[bob]')).toBe('/foo/:name/bar/:bob');
});

test('parses catchall', () => {
  expect(pathToPattern('foo/[...name]')).toBe('/foo/:name*');
  expect(pathToPattern('foo/[...]')).toBe('/foo/(.*)');
});

test('parses multiple params in same part', () => {
  expect(pathToPattern('foo/[mod]@[version]')).toBe('/foo/:mod@:version');
  expect(pathToPattern('foo/[bar].json')).toBe('/foo/:bar.json');
  expect(pathToPattern('foo/foo[bar]')).toBe('/foo/foo:bar');
});

test('parses optional params', () => {
  expect(pathToPattern('foo/[[name]]')).toBe('/foo{/:name}?');
  expect(pathToPattern('foo/[name]/[[bob]]')).toBe('/foo/:name{/:bob}?');
  expect(pathToPattern('foo/[[name]]/bar')).toBe('/foo{/:name}?/bar');
  expect(pathToPattern('foo/[[name]]/bar/[[bob]]')).toBe(
    '/foo{/:name}?/bar{/:bob}?'
  );
});

test('throws on invalid patterns', () => {
  expect(() => pathToPattern('foo/[foo][bar]')).toThrowError();
  expect(() => pathToPattern('foo/foo]')).toThrowError();
  expect(() => pathToPattern('foo/[foo]]')).toThrowError();
  expect(() => pathToPattern('foo/foo-[[name]]-bar/baz')).toThrowError();
  expect(() => pathToPattern('foo/[[name]]-bar/baz')).toThrowError();
  expect(() => pathToPattern('foo/foo-[[name]]/baz')).toThrowError();
  expect(() => pathToPattern('foo/foo-[[name]]')).toThrowError();
  expect(() => pathToPattern('foo/[[name]]-bar')).toThrowError();
});

test('sortRoutePaths', () => {
  const routes = [
    '/(group)/[...all]',
    '/foo/[id]',
    '/foo/[...slug]',
    '/foo/bar',
    '/foo/_layout',
    '/foo/index',
    '/foo/_middleware',
    '/foo/bar/_middleware',
    '/foo/bar/index',
    '/foo/bar/[...foo]',
    '/foo/bar/baz',
    '/foo/bar/_layout',
  ];
  const sorted = [
    '/foo/_middleware',
    '/foo/_layout',
    '/foo/bar',
    '/foo/index',
    '/foo/bar/_middleware',
    '/foo/bar/_layout',
    '/foo/bar/index',
    '/foo/bar/baz',
    '/foo/bar/[...foo]',
    '/foo/[id]',
    '/foo/[...slug]',
    '/(group)/[...all]',
  ];
  routes.sort(sortRoutePaths);
  expect(routes).toEqual(sorted);
});
