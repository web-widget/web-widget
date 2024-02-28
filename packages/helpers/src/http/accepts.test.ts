import type { Accept, acceptsConfig, acceptsOptions } from './accepts';
import { parseAccept, defaultMatch, accepts } from './accepts';

describe('parseAccept', () => {
  test('should parse accept header', () => {
    const acceptHeader =
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8;level=1;foo=bar';
    const accepts = parseAccept(acceptHeader);
    expect(accepts).toEqual([
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8', level: '1', foo: 'bar' }, q: 0.8 },
    ]);
  });
});

describe('defaultMatch', () => {
  test('should return default support', () => {
    const accepts: Accept[] = [
      { type: 'text/html', params: {}, q: 1 },
      { type: 'application/xhtml+xml', params: {}, q: 1 },
      { type: 'application/xml', params: { q: '0.9' }, q: 0.9 },
      { type: 'image/webp', params: {}, q: 1 },
      { type: '*/*', params: { q: '0.8' }, q: 0.8 },
    ];
    const config: acceptsConfig = {
      header: 'Accept',
      supports: ['text/html'],
      default: 'text/html',
    };
    const result = defaultMatch(accepts, config);
    expect(result).toBe('text/html');
  });
});

describe('accepts', () => {
  test('should return matched support', () => {
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
    };
    const result = accepts(
      new Request('http://localhost', {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      }),
      options
    );
    expect(result).toBe('text/html');
  });

  test('should return default support if no matched support', () => {
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    };
    const result = accepts(
      new Request('http://localhost', {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      }),
      options
    );
    expect(result).toBe('text/html');
  });

  test('should return default support if no accept header', () => {
    const options: acceptsConfig = {
      header: 'Accept',
      supports: ['application/json'],
      default: 'text/html',
    };
    const result = accepts(
      new Request('http://localhost', {
        headers: {},
      }),
      options
    );
    expect(result).toBe('text/html');
  });

  test('should return matched support with custom match function', () => {
    // this match function will return the least q value
    const match = (accepts: Accept[], config: acceptsConfig) => {
      const { supports, default: defaultSupport } = config;
      const accept = accepts
        .sort((a, b) => a.q - b.q)
        .find((accept) => supports.includes(accept.type));
      return accept ? accept.type : defaultSupport;
    };
    const options: acceptsOptions = {
      header: 'Accept',
      supports: ['application/xml', 'text/html'],
      default: 'application/json',
      match,
    };
    const result = accepts(
      new Request('http://localhost', {
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      }),
      options
    );
    expect(result).toBe('application/xml');
  });
});

describe('Usage', () => {
  test('decide compression by Accept-Encoding header', async () => {
    const app = async (req: Request) => {
      const encoding = accepts(req, {
        header: 'Accept-Encoding',
        supports: ['gzip', 'deflate'],
        default: 'identity',
      });

      if (encoding === 'gzip') {
        return new Response(null, {
          headers: { 'Content-Encoding': 'gzip' },
        });
      }

      if (encoding === 'deflate') {
        return new Response(null, {
          headers: { 'Content-Encoding': 'deflate' },
        });
      }

      return new Response(null);
    };

    const request = async (url: string, init: RequestInit) => {
      return app(new Request(`http://localhost${url}`, init));
    };

    const req1 = await request('/compressed', {
      headers: { 'Accept-Encoding': 'deflate' },
    });
    const req2 = await request('/compressed', {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    const req3 = await request('/compressed', {
      headers: { 'Accept-Encoding': 'gzip;q=0.5,deflate' },
    });
    const req4 = await request('/compressed', {
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(req1.headers.get('Content-Encoding')).toBe('deflate');
    expect(req2.headers.get('Content-Encoding')).toBe('gzip');
    expect(req3.headers.get('Content-Encoding')).toBe('deflate');
    expect(req4.headers.get('Content-Encoding')).toBeNull();
  });

  test('decide language by Accept-Language header', async () => {
    const SUPPORTED_LANGS = ['en', 'ja', 'zh'];

    const app = async (req: Request) => {
      const lang = accepts(req, {
        header: 'Accept-Language',
        supports: SUPPORTED_LANGS,
        default: 'en',
      });
      const pathname = new URL(req.url).pathname;
      const isLangedPath = SUPPORTED_LANGS.some((l) =>
        pathname.startsWith(`/${l}`)
      );
      if (isLangedPath) {
        return new Response(`lang: ${lang}`);
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: `/${lang}${pathname}`,
        },
      });
    };

    const request = async (url: string, init: RequestInit) => {
      return app(new Request(`http://localhost${url}`, init));
    };

    const req1 = await request('/foo', {
      headers: { 'Accept-Language': 'en=0.8,ja' },
    });
    const req2 = await request('/en/foo', {
      headers: { 'Accept-Language': 'en' },
    });

    expect(req1.status).toBe(302);
    expect(req1.headers.get('Location')).toBe('/ja/foo');
    expect(await req2.text()).toBe('lang: en');
  });
});
