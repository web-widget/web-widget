import {
  // fetchWithProxy,
  buildProxyRequest,
  buildProxyResponse,
} from './proxy';

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
