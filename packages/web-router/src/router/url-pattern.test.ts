/**
 * @fileoverview URLPattern Router Tests
 * Tests for URLPattern router implementation
 */
import { URLPatternRouter } from './url-pattern';
import { CommonRouterTestRules } from './__tests__/base';

describe('basic', () => {
  const router = new URLPatternRouter<string>();
  // Run all common tests
  CommonRouterTestRules.runAllTests(() => router);
});

describe('complex', () => {
  const router = new URLPatternRouter<string>();

  test('named param', async () => {
    router.add('GET', '/entry/:id', 'get entry');
    const res = router.match('GET', '/entry/123');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get entry');
    expect(res[0][1]['id']).toBe('123');
  });

  test('named param with trailing wildcard', async () => {
    router.add('GET', '/article/:id/*', 'get article with wildcard');
    let res = router.match('GET', '/article/123');
    // expect(res.length).toBe(1);
    // expect(res[0][0]).toEqual("get article with wildcard");
    // expect(res[0][1]["id"]).toBe("123");
    res = router.match('GET', '/article/123/action');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get article with wildcard');
    expect(res[0][1]['id']).toBe('123');
  });

  test('wildcard', async () => {
    router.add('GET', '/wild/*/card', 'get wildcard');
    const res = router.match('GET', '/wild/xxx/card');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get wildcard');
  });

  test('default', async () => {
    router.add('GET', '/api/*', 'fallback');
    router.add('GET', '/api/abc', 'get api');
    let res = router.match('GET', '/api/abc');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('fallback');
    expect(res[1][0]).toEqual('get api');
    res = router.match('GET', '/api/def');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('fallback');
  });

  test('regexp', async () => {
    router.add('GET', '/post/:date([0-9]+)/:title([a-z]+)', 'get post');
    let res = router.match('GET', '/post/20210101/hello');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get post');
    expect(res[0][1]['date']).toBe('20210101');
    expect(res[0][1]['title']).toBe('hello');
    res = router.match('GET', '/post/onetwothree');
    expect(res.length).toBe(0);
    res = router.match('GET', '/post/123/123');
    expect(res.length).toBe(0);
  });
});

describe('multi match', () => {
  const router = new URLPatternRouter<string>();

  describe('blog', () => {
    router.add('ALL', '*', 'middleware a');
    router.add('GET', '*', 'middleware b');
    router.add('GET', '/entry', 'get entries');
    router.add('POST', '/entry/*', 'middleware c');
    router.add('POST', '/entry', 'post entry');
    router.add('GET', '/entry/:id', 'get entry');
    router.add('GET', '/entry/:id/comment/:comment_id', 'get comment');
    test('GET /', async () => {
      const res = router.match('GET', '/');
      expect(res.length).toBe(2);
      expect(res[0][0]).toEqual('middleware a');
      expect(res[1][0]).toEqual('middleware b');
    });
    test('GET /entry/123', async () => {
      const res = router.match('GET', '/entry/123');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('middleware a');
      // expect(res[0][1]).toEqual({});
      expect(res[1][0]).toEqual('middleware b');
      // expect(res[1][1]).toEqual({});
      expect(res[2][0]).toEqual('get entry');
      expect(res[2][1]['id']).toBe('123');
    });
    test('GET /entry/123/comment/456', async () => {
      const res = router.match('GET', '/entry/123/comment/456');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('middleware a');
      // expect(res[1][1]).toEqual({});
      expect(res[1][0]).toEqual('middleware b');
      // expect(res[1][1]).toEqual({});
      expect(res[2][0]).toEqual('get comment');
      expect(res[2][1]['id']).toBe('123');
      expect(res[2][1]['comment_id']).toBe('456');
    });
    test('POST /entry', async () => {
      const res = router.match('POST', '/entry');
      // expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('middleware a');
      // expect(res[1][0]).toEqual("middleware c");
      //  expect(res[2][0]).toEqual("post entry");
    });
    test('DELETE /entry', async () => {
      const res = router.match('DELETE', '/entry');
      expect(res.length).toBe(1);
      expect(res[0][0]).toEqual('middleware a');
    });
  });
});

describe('fallback', () => {
  const router = new URLPatternRouter<string>();
  router.add('POST', '/entry', 'post entry');
  router.add('POST', '/entry/*', 'fallback');
  router.add('GET', '/entry/:id', 'get entry');
  test('POST /entry', async () => {
    const res = router.match('POST', '/entry');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('post entry');
  });
});

describe('page', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/page', 'page');
  router.add('ALL', '*', 'fallback'); // or '*'
  test('GET /page', async () => {
    const res = router.match('GET', '/page');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('page');
    expect(res[1][0]).toEqual('fallback');
  });
});

describe('optional route', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/api/animals/:type?', 'animals');
  test('GET /api/animals/dog', async () => {
    const res = router.match('GET', '/api/animals/dog');
    expect(res[0][0]).toEqual('animals');
    expect(res[0][1]['type']).toBe('dog');
  });
  test('GET /api/animals', async () => {
    const res = router.match('GET', '/api/animals');
    expect(res[0][0]).toEqual('animals');
    expect(res[0][1]['type']).toBeUndefined();
  });
});

describe('routing order with named parameters', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/book/a', 'no-slug');
  router.add('GET', '/book/:slug', 'slug');
  router.add('GET', '/book/b', 'no-slug-b');
  test('GET /book/a', async () => {
    const res = router.match('GET', '/book/a');
    expect(res[0][0]).toEqual('no-slug');
    expect(res[0][1]).toEqual({});
    expect(res[1][0]).toEqual('slug');
    expect(res[1][1]['slug']).toBe('a');
  });
  test('GET /book/foo', async () => {
    const res = router.match('GET', '/book/foo');
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('foo');
  });
  test('GET /book/b', async () => {
    const res = router.match('GET', '/book/b');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('b');
    expect(res[1][0]).toEqual('no-slug-b');
    expect(res[1][1]).toEqual({});
  });
});

describe('trailing slash', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/book', 'GET /book');
  router.add('GET', '/book/:id', 'GET /book/:id');
  test('GET /book', () => {
    const res = router.match('GET', '/book');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('GET /book');
  });
  test('GET /book/', () => {
    const res = router.match('GET', '/book/');
    expect(res.length).toBe(0);
  });
});

describe('same path', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/hey', 'Middleware A');
  router.add('GET', '/hey', 'Middleware B');
  test('GET /hey', () => {
    const res = router.match('GET', '/hey');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('Middleware A');
    expect(res[1][0]).toEqual('Middleware B');
  });
});

describe('including slashes', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/js/:filename([a-z0-9/]+.js)', 'any file');
  router.add('GET', '/js/main.js', 'main.js');

  test('GET /js/main.js', () => {
    const res = router.match('GET', '/js/main.js');
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'main.js' });
    expect(res[1][0]).toEqual('main.js');
    expect(res[1][1]).toEqual({});
  });

  test('GET /js/chunk/123.js', () => {
    const res = router.match('GET', '/js/chunk/123.js');
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'chunk/123.js' });
  });

  test('GET /js/chunk/nest/123.js', () => {
    const res = router.match('GET', '/js/chunk/nest/123.js');
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'chunk/nest/123.js' });
  });
});

describe('REST API', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', '/users/:username([a-z]+)', 'profile');
  router.add('GET', '/users/:username([a-z]+)/posts', 'posts');

  test('GET /users/aui', () => {
    const res = router.match('GET', '/users/aui');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('profile');
  });

  test('GET /users/aui/posts', () => {
    const res = router.match('GET', '/users/aui/posts');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('posts');
  });
});

describe('duplicate param name', () => {
  test('self', () => {
    const router = new URLPatternRouter<string>();
    expect(() => {
      router.add('GET', '/:id/:id', 'foo');
    }).toThrow('Duplicated part names');
  });

  test('parent', () => {
    const router = new URLPatternRouter<string>();
    router.add('GET', '/:id/:action', 'foo');
    router.add('GET', '/posts/:id', 'bar');
    const res = router.match('GET', '/posts/get');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('foo');
    expect(res[0][1]['id']).toBe('posts');
    expect(res[0][1]['action']).toBe('get');
    expect(res[1][0]).toEqual('bar');
    expect(res[1][1]['id']).toBe('get');
  });

  test('child', () => {
    const router = new URLPatternRouter<string>();
    router.add('GET', '/posts/:id', 'foo');
    router.add('GET', '/:id/:action', 'bar');
    const res = router.match('GET', '/posts/get');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('foo');
    expect(res[0][1]['id']).toBe('get');
    expect(res[1][0]).toEqual('bar');
    expect(res[1][1]['id']).toBe('posts');
    expect(res[1][1]['action']).toBe('get');
  });

  test('hierarchy', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/posts/:id/comments/:comment_id', 'foo');
    expect(() => {
      router.add('get', '/posts/:id', 'bar');
    }).not.toThrowError();
  });

  test('regular expression', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/:id/:action{create|update}', 'foo');
    expect(() => {
      router.add('get', '/:id/:action{delete}', 'bar');
    }).not.toThrowError();
  });
});

describe('sort order', () => {
  describe('basic', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '*', 'a');
    router.add('get', '/page', '/page');
    router.add('get', '/:slug', '/:slug');

    test('GET /page', () => {
      const res = router.match('get', '/page');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('/page');
      expect(res[2][0]).toEqual('/:slug');
    });
  });

  describe('with named path', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '*', 'a');
    router.add('get', '/posts/:id', '/posts/:id');
    router.add('get', '/:type/:id', '/:type/:id');

    test('GET /posts/123', () => {
      const res = router.match('get', '/posts/123');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('/posts/:id');
      expect(res[2][0]).toEqual('/:type/:id');
    });
  });

  describe('with wildcards', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/api/*', '1st');
    router.add('get', '/api/*', '2nd');
    router.add('get', '/api/posts/:id', '3rd');
    router.add('get', '/api/*', '4th');

    test('GET /api/posts/123', () => {
      const res = router.match('get', '/api/posts/123');
      expect(res.length).toBe(4);
      expect(res[0][0]).toEqual('1st');
      expect(res[1][0]).toEqual('2nd');
      expect(res[2][0]).toEqual('3rd');
      expect(res[3][0]).toEqual('4th');
    });
  });

  describe('with special wildcard', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/posts', '/posts'); // 1.1
    router.add('get', '/posts/*', '/posts/*'); // 1.2
    router.add('get', '/posts/:id', '/posts/:id'); // 2.3

    test('GET /posts', () => {
      const res = router.match('get', '/posts');

      expect(res.length).toBe(1);
      expect(res[0][0]).toEqual('/posts');
    });
  });

  describe('complex', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/api', 'a'); // not match
    router.add('get', '/api/*', 'b'); // match
    router.add('get', '/api/:type', 'c'); // not match
    router.add('get', '/api/:type/:id', 'd'); // match
    router.add('get', '/api/posts/:id', 'e'); // match
    router.add('get', '/api/posts/123', 'f'); // match
    router.add('get', '/*/*/:id', 'g'); // match
    router.add('get', '/api/posts/*/comment', 'h'); // not match
    router.add('get', '*', 'i'); // match
    router.add('get', '*', 'j'); // match

    test('GET /api/posts/123', () => {
      const res = router.match('get', '/api/posts/123');
      expect(res.length).toBe(7);
      expect(res[0][0]).toEqual('b');
      expect(res[1][0]).toEqual('d');
      expect(res[2][0]).toEqual('e');
      expect(res[3][0]).toEqual('f');
      expect(res[4][0]).toEqual('g');
      expect(res[5][0]).toEqual('i');
      expect(res[6][0]).toEqual('j');
    });
  });

  describe('multi match', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '*', 'GET *'); // 0.1
    router.add('get', '/abc/*', 'GET /abc/*'); // 1.2
    router.add('get', '/abc/edf', 'GET /abc/edf'); // 2.3
    router.add('get', '/abc/*/ghi/jkl', 'GET /abc/*/ghi/jkl'); // 4.4
    test('GET /abc/edf', () => {
      const res = router.match('get', '/abc/edf');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('GET *');
      expect(res[1][0]).toEqual('GET /abc/*');
      expect(res[2][0]).toEqual('GET /abc/edf');
    });
  });

  describe('multi match', () => {
    const router = new URLPatternRouter<string>();

    router.add('get', '/api/*', 'a'); // 2.1 for /api/entry
    router.add('get', '/api/entry', 'entry'); // 2.2
    router.add('ALL', '/api/*', 'b'); // 2.3 for /api/entry

    test('GET /api/entry', async () => {
      const res = router.match('get', '/api/entry');
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('entry');
      expect(res[2][0]).toEqual('b');
    });
  });

  describe('fallback', () => {
    describe('blog - failed', () => {
      const router = new URLPatternRouter<string>();
      router.add('post', '/entry', 'post entry'); // 1.1
      router.add('post', '/entry/*', 'fallback'); // 1.2
      router.add('get', '/entry/:id', 'get entry'); // 2.3
      test('POST /entry', async () => {
        const res = router.match('post', '/entry');
        expect(res.length).toBe(1);
        expect(res[0][0]).toEqual('post entry');
      });
    });
  });
  describe('page', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', '/page', 'page'); // 1.1
    router.add('ALL', '*', 'fallback'); // 1.2
    test('GET /page', async () => {
      const res = router.match('get', '/page');
      expect(res.length).toBe(2);
      expect(res[0][0]).toEqual('page');
      expect(res[1][0]).toEqual('fallback');
    });
  });
});

describe('star', () => {
  const router = new URLPatternRouter<string>();
  router.add('get', '/', '/');
  router.add('get', '*', '*');
  router.add('get', '*', '*');

  router.add('get', '/x', '/x');
  router.add('get', '/x/*', '/x/*');

  test('top', async () => {
    const res = router.match('get', '/');
    expect(res.length).toBe(3);
    expect(res[0][0]).toEqual('/');
    expect(res[1][0]).toEqual('*');
    expect(res[2][0]).toEqual('*');
  });

  test('under a certain path', async () => {
    const res = router.match('get', '/x');
    expect(res.length).toBe(3);
    expect(res[0][0]).toEqual('*');
    expect(res[1][0]).toEqual('*');
    expect(res[2][0]).toEqual('/x');
    //expect(res[3][0]).toEqual("/x/*");
  });
});

describe('routing order with named parameters', () => {
  const router = new URLPatternRouter<string>();
  router.add('get', '/book/a', 'no-slug');
  router.add('get', '/book/:slug', 'slug');
  router.add('get', '/book/b', 'no-slug-b');
  test('/book/a', () => {
    const res = router.match('get', '/book/a');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('no-slug');
    expect(res[0][1]).toEqual({});
    expect(res[1][0]).toEqual('slug');
    expect(res[1][1]['slug']).toBe('a');
  });

  test('/book/foo', () => {
    const res = router.match('get', '/book/foo');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('foo');
  });
  test('/book/b', () => {
    const res = router.match('get', '/book/b');
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('b');
    expect(res[1][0]).toEqual('no-slug-b');
    expect(res[1][1]).toEqual({});
  });
});

describe('routing with pathname patterns (not hostname)', () => {
  // Note: These tests were originally labeled as "hostname" routing, but they actually
  // test pathname patterns that happen to contain domain-like strings.
  // True hostname routing would require URLPattern with separate hostname/pathname components.
  const router = new URLPatternRouter<string>();
  router.add('get', '/www1.example.com/hello', 'www1');
  router.add('get', '/www2.example.com/hello', 'www2');
  test('GET /www1.example.com/hello', () => {
    const res = router.match('get', '/www1.example.com/hello');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('www1');
  });
  test('GET /www2.example.com/hello', () => {
    const res = router.match('get', '/www2.example.com/hello');
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('www2');
  });
  test('GET /hello', () => {
    const res = router.match('get', '/hello');
    expect(res.length).toBe(0);
  });
});
