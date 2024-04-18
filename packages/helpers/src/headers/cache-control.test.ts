import { cacheControl, responseCacheControl } from './cache-control';

test('should append cache control headers', () => {
  const headers = new Headers();
  cacheControl(headers, 'public, max-age=31536000');
  expect(headers.get('cache-control')).toBe('public, max-age=31536000');
});

test('should not duplicate existing cache control directives', () => {
  const headers = new Headers();
  headers.append('cache-control', 'public');
  cacheControl(headers, 'public, max-age=31536000');
  expect(headers.get('cache-control')).toBe('public, max-age=31536000');
});

test('should not duplicate existing cache control directives with different casing', () => {
  const headers = new Headers();
  headers.append('cache-control', 'public, max-age=1');
  cacheControl(headers, 'Public, max-age=31536000');
  expect(headers.get('cache-control')).toBe('public, max-age=1');
});

test('should append multiple cache control headers', () => {
  const headers = new Headers();
  cacheControl(headers, ['public', 'max-age=31536000']);
  expect(headers.get('cache-control')).toBe('public, max-age=31536000');
});

test('should append response cache control headers', () => {
  const headers = new Headers();
  responseCacheControl(headers, {
    immutable: true,
    maxAge: 10,
    mustRevalidate: true,
    mustUnderstand: true,
    noCache: true,
    noStore: true,
    noTransform: true,
    proxyRevalidate: true,
    public: false,
    sharedMaxAge: 20,
    staleIfError: 30,
    staleWhileRevalidate: 40,
  });
  expect(headers.get('cache-control')).toBe(
    [
      'immutable',
      'max-age=10',
      'must-revalidate',
      'must-understand',
      'no-cache',
      'no-store',
      'no-transform',
      'proxy-revalidate',
      'private',
      's-maxage=20',
      'stale-if-error=30',
      'stale-while-revalidate=40',
    ].join(', ')
  );
});
