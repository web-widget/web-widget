import {
  resolveForwardedUrl,
  normalizeForwardedRequest,
  parseForwardedHeaders,
  // fetchWithProxy,
  buildProxyRequest,
  buildProxyResponse,
} from './index';

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

describe('fetchWithProxy', () => {
  it('should fetch a resource using a proxy', async () => {
    // TODO..
  });
});

describe('buildProxyRequest', () => {
  it('should build a proxy request correctly', () => {
    const request = buildProxyRequest('http://example.com', {
      headers: { 'x-custom-header': 'value' },
    });
    expect(request.headers.get('x-custom-header')).toBe('value');
  });
});

describe('buildProxyResponse', () => {
  it('should build a proxy response correctly', () => {
    const originalResponse = new Response('OK', {
      headers: { 'content-encoding': 'gzip', 'content-length': '2' },
    });
    const response = buildProxyResponse(originalResponse);
    expect(response.headers.has('content-encoding')).toBe(false);

    // NOTE: The test environment does not correctly implement the Response interface.
    // const testEnvBugDemo = new Response(
    //   new Response('OK', {
    //     headers: { 'content-length': '999' },
    //   }).body,
    //   {
    //     headers: {
    //       'content-length': '2',
    //     },
    //   }
    // );
    // console.log(testEnvBugDemo.headers.get('content-length')); // 999

    // expect(response.headers.has('content-length')).toBe(false);
  });
});
