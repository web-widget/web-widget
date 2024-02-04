import { addTrailingSlash } from './utils';

test('addTrailingSlash', () => {
  expect(addTrailingSlash('/foo/bar')).toBe('/foo/bar/');
  expect(addTrailingSlash('/foo/:bar')).toBe('/foo/:bar/');
  expect(addTrailingSlash('/')).toBe('/');
  expect(addTrailingSlash('/foo/bar.html')).toBe('/foo/bar.html');
  expect(addTrailingSlash('/foo/:all*')).toBe('/foo/:all*');
});
