import { assert, test } from 'vitest';
import { addTrailingSlash } from './utils';

test('addTrailingSlash', () => {
  assert(addTrailingSlash('foo/bar'), '/foo/bar/');
  assert(addTrailingSlash('foo/:bar'), '/foo/:bar/');
  assert(addTrailingSlash('foo/bar.html'), '/foo/bar.html');
  assert(addTrailingSlash('foo/:all*'), '/foo/:all*');
});
