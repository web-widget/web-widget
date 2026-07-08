import { addTrailingSlash } from './utils';

describe('addTrailingSlash', () => {
  it('adds trailing slash to route-like pathnames', () => {
    expect(addTrailingSlash('/foo/bar')).toBe('/foo/bar/');
    expect(addTrailingSlash('/foo/:bar')).toBe('/foo/:bar/');
    expect(addTrailingSlash('/foo/:all*')).toBe('/foo/:all*/');
    expect(addTrailingSlash('/foo/(.*)')).toBe('/foo/(.*)/');
    expect(addTrailingSlash('/')).toBe('/');
    expect(addTrailingSlash('/docs{/:version}?')).toBe('/docs{/:version}?/');
  });

  it('leaves file pathnames unchanged', () => {
    expect(addTrailingSlash('/foo/bar.html')).toBe('/foo/bar.html');
  });
});
