import {
  resolveForwardedUrl,
  normalizeForwardedRequest,
  parseForwardedHeaders,
} from './original';

describe('resolveForwardedUrl', () => {
  it('should resolve forwarded URL correctly', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-host': 'forwarded.com',
        'x-forwarded-proto': 'https',
      },
    });
    const url = resolveForwardedUrl(request);
    expect(url.host).toBe('forwarded.com');
    expect(url.protocol).toBe('https:');
  });
});

describe('normalizeForwardedRequest', () => {
  it('should return a new request with resolved URL', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-host': 'forwarded.com',
        'x-forwarded-proto': 'https',
      },
    });
    const normalizedRequest = normalizeForwardedRequest(request);
    expect(normalizedRequest.url).toBe('https://forwarded.com/');
  });
});

describe('parseForwardedHeaders', () => {
  it('should parse forwarded headers correctly', () => {
    const headers = new Headers({
      'x-forwarded-host': 'forwarded.com',
      'x-forwarded-proto': 'https',
    });
    const result = parseForwardedHeaders(headers);
    expect(result).toEqual({ host: 'forwarded.com', proto: 'https' });
  });
});
