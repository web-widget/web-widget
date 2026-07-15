import { describe, expect, test } from '@jest/globals';
import { addTrailingSlash, getExtension, removeExtension } from './utils';

describe('addTrailingSlash', () => {
  test('adds trailing slash to route-like pathnames', () => {
    expect(addTrailingSlash('/foo/bar')).toBe('/foo/bar/');
    expect(addTrailingSlash('/foo/:bar')).toBe('/foo/:bar/');
    expect(addTrailingSlash('/foo/:all*')).toBe('/foo/:all*/');
    expect(addTrailingSlash('/foo/(.*)')).toBe('/foo/(.*)/');
    expect(addTrailingSlash('/')).toBe('/');
    expect(addTrailingSlash('/docs{/:version}?')).toBe('/docs{/:version}?/');
  });

  test('leaves file pathnames unchanged', () => {
    expect(addTrailingSlash('/foo/bar.html')).toBe('/foo/bar.html');
  });
});

describe('routing file extensions', () => {
  test.each([
    ['index@route.html.ts', '.html.ts', 'index@route'],
    ['index@route.solid.tsx', '.solid.tsx', 'index@route'],
    ['index@route.preact.jsx', '.preact.jsx', 'index@route'],
    ['Counter@widget.custom.ts', '.custom.ts', 'Counter@widget'],
  ])('recognizes adapter compound extension in %s', (file, extension, stem) => {
    expect(getExtension(file)).toBe(extension);
    expect(removeExtension(file)).toBe(stem);
  });

  test.each([
    ['index@route.tsx', '.tsx', 'index@route'],
    ['example.test.ts', '.ts', 'example.test'],
    ['types.d.ts', '.d.ts', 'types'],
  ])(
    'preserves standard extension behavior for %s',
    (file, extension, stem) => {
      expect(getExtension(file)).toBe(extension);
      expect(removeExtension(file)).toBe(stem);
    }
  );
});
