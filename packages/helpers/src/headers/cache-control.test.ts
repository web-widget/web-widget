import { cacheControl } from './cache-control';

test('should append cache control headers', () => {
  const headers = new Headers();
  cacheControl(headers, 'public, max-age=31536000');
  expect(headers.get('Cache-Control')).toBe('public, max-age=31536000');
});

test('should not duplicate existing cache control directives', () => {
  const headers = new Headers();
  headers.append('Cache-Control', 'public');
  cacheControl(headers, 'public, max-age=31536000');
  expect(headers.get('Cache-Control')).toBe('public, max-age=31536000');
});

test('should not duplicate existing cache control directives with different casing', () => {
  const headers = new Headers();
  headers.append('Cache-Control', 'public');
  cacheControl(headers, 'Public, max-age=31536000');
  expect(headers.get('Cache-Control')).toBe('public, max-age=31536000');
});
