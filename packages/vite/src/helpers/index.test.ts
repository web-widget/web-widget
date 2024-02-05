import { addTrailingSlash } from './index';

describe('addTrailingSlash', () => {
  expect(addTrailingSlash('/foo/bar')).toBe('/foo/bar/');
  expect(addTrailingSlash('/foo/:bar')).toBe('/foo/:bar/');
  expect(addTrailingSlash('/foo/:all*')).toBe('/foo/:all*/');
  expect(addTrailingSlash('/foo/(.*)')).toBe('/foo/(.*)/');
  expect(addTrailingSlash('/')).toBe('/');
  expect(addTrailingSlash('/docs{/:version}?')).toBe('/docs{/:version}?/');
  test("doesn't add trailing slash to file paths", () => {
    expect(addTrailingSlash('/foo/bar.html')).toBe('/foo/bar.html');
  });
});
