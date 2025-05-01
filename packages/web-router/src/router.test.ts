import { UnsupportedPathError, URLPatternRouter } from './router';

describe('basic', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/hello' }, 'get hello');
  router.add('POST', { pathname: '/hello' }, 'post hello');
  router.add('PURGE', { pathname: '/hello' }, 'purge hello');

  test('get, post, purge hello', async () => {
    let res = router.match('GET', { pathname: '/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get hello');
    res = router.match('POST', { pathname: '/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('post hello');
    res = router.match('PURGE', { pathname: '/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('purge hello');
    res = router.match('PUT', { pathname: '/hello' });
    expect(res.length).toBe(0);
    res = router.match('GET', { pathname: '/' });
    expect(res.length).toBe(0);
  });
});

describe('complex', () => {
  const router = new URLPatternRouter<string>();

  test('named param', async () => {
    router.add('GET', { pathname: '/entry/:id' }, 'get entry');
    const res = router.match('GET', { pathname: '/entry/123' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get entry');
    expect(res[0][1]['id']).toBe('123');
  });

  test('named param with trailing wildcard', async () => {
    router.add(
      'GET',
      { pathname: '/article/:id/*' },
      'get article with wildcard'
    );
    let res = router.match('GET', { pathname: '/article/123' });
    // expect(res.length).toBe(1);
    // expect(res[0][0]).toEqual("get article with wildcard");
    // expect(res[0][1]["id"]).toBe("123");
    res = router.match('GET', { pathname: '/article/123/action' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get article with wildcard');
    expect(res[0][1]['id']).toBe('123');
  });

  test('wildcard', async () => {
    router.add('GET', { pathname: '/wild/*/card' }, 'get wildcard');
    const res = router.match('GET', { pathname: '/wild/xxx/card' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get wildcard');
  });

  test('default', async () => {
    router.add('GET', { pathname: '/api/*' }, 'fallback');
    router.add('GET', { pathname: '/api/abc' }, 'get api');
    let res = router.match('GET', { pathname: '/api/abc' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('fallback');
    expect(res[1][0]).toEqual('get api');
    res = router.match('GET', { pathname: '/api/def' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('fallback');
  });

  test('regexp', async () => {
    router.add(
      'GET',
      { pathname: '/post/:date([0-9]+)/:title([a-z]+)' },
      'get post'
    );
    let res = router.match('GET', { pathname: '/post/20210101/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get post');
    expect(res[0][1]['date']).toBe('20210101');
    expect(res[0][1]['title']).toBe('hello');
    res = router.match('GET', { pathname: '/post/onetwothree' });
    expect(res.length).toBe(0);
    res = router.match('GET', { pathname: '/post/123/123' });
    expect(res.length).toBe(0);
  });
});

describe('multi match', () => {
  const router = new URLPatternRouter<string>();

  describe('blog', () => {
    router.add('ALL', { pathname: '*' }, 'middleware a');
    router.add('GET', { pathname: '*' }, 'middleware b');
    router.add('GET', { pathname: '/entry' }, 'get entries');
    router.add('POST', { pathname: '/entry/*' }, 'middleware c');
    router.add('POST', { pathname: '/entry' }, 'post entry');
    router.add('GET', { pathname: '/entry/:id' }, 'get entry');
    router.add(
      'GET',
      { pathname: '/entry/:id/comment/:comment_id' },
      'get comment'
    );
    test('GET /', async () => {
      const res = router.match('GET', { pathname: '/' });
      expect(res.length).toBe(2);
      expect(res[0][0]).toEqual('middleware a');
      expect(res[1][0]).toEqual('middleware b');
    });
    test('GET /entry/123', async () => {
      const res = router.match('GET', { pathname: '/entry/123' });
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('middleware a');
      // expect(res[0][1]).toEqual({});
      expect(res[1][0]).toEqual('middleware b');
      // expect(res[1][1]).toEqual({});
      expect(res[2][0]).toEqual('get entry');
      expect(res[2][1]['id']).toBe('123');
    });
    test('GET /entry/123/comment/456', async () => {
      const res = router.match('GET', { pathname: '/entry/123/comment/456' });
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
      const res = router.match('POST', { pathname: '/entry' });
      // expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('middleware a');
      // expect(res[1][0]).toEqual("middleware c");
      //  expect(res[2][0]).toEqual("post entry");
    });
    test('DELETE /entry', async () => {
      const res = router.match('DELETE', { pathname: '/entry' });
      expect(res.length).toBe(1);
      expect(res[0][0]).toEqual('middleware a');
    });
  });
});

describe('fallback', () => {
  const router = new URLPatternRouter<string>();
  router.add('POST', { pathname: '/entry' }, 'post entry');
  router.add('POST', { pathname: '/entry/*' }, 'fallback');
  router.add('GET', { pathname: '/entry/:id' }, 'get entry');
  test('POST /entry', async () => {
    const res = router.match('POST', { pathname: '/entry' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('post entry');
  });
});

describe('page', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/page' }, 'page');
  router.add('ALL', { pathname: '*' }, 'fallback'); // or '*'
  test('GET /page', async () => {
    const res = router.match('GET', { pathname: '/page' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('page');
    expect(res[1][0]).toEqual('fallback');
  });
});

describe('optional route', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/api/animals/:type?' }, 'animals');
  test('GET /api/animals/dog', async () => {
    const res = router.match('GET', { pathname: '/api/animals/dog' });
    expect(res[0][0]).toEqual('animals');
    expect(res[0][1]['type']).toBe('dog');
  });
  test('GET /api/animals', async () => {
    const res = router.match('GET', { pathname: '/api/animals' });
    expect(res[0][0]).toEqual('animals');
    expect(res[0][1]['type']).toBeUndefined();
  });
});

describe('routing order with named parameters', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/book/a' }, 'no-slug');
  router.add('GET', { pathname: '/book/:slug' }, 'slug');
  router.add('GET', { pathname: '/book/b' }, 'no-slug-b');
  test('GET /book/a', async () => {
    const res = router.match('GET', { pathname: '/book/a' });
    expect(res[0][0]).toEqual('no-slug');
    expect(res[0][1]).toEqual({});
    expect(res[1][0]).toEqual('slug');
    expect(res[1][1]['slug']).toBe('a');
  });
  test('GET /book/foo', async () => {
    const res = router.match('GET', { pathname: '/book/foo' });
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('foo');
  });
  test('GET /book/b', async () => {
    const res = router.match('GET', { pathname: '/book/b' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('b');
    expect(res[1][0]).toEqual('no-slug-b');
    expect(res[1][1]).toEqual({});
  });
});

describe('trailing slash', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/book' }, 'GET /book');
  router.add('GET', { pathname: '/book/:id' }, 'GET /book/:id');
  test('GET /book', () => {
    const res = router.match('GET', { pathname: '/book' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('GET /book');
  });
  test('GET /book/', () => {
    const res = router.match('GET', { pathname: '/book/' });
    expect(res.length).toBe(0);
  });
});

describe('same path', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/hey' }, 'Middleware A');
  router.add('GET', { pathname: '/hey' }, 'Middleware B');
  test('GET /hey', () => {
    const res = router.match('GET', { pathname: '/hey' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('Middleware A');
    expect(res[1][0]).toEqual('Middleware B');
  });
});

describe('including slashes', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/js/:filename([a-z0-9/]+.js)' }, 'any file');
  router.add('GET', { pathname: '/js/main.js' }, 'main.js');

  test('GET /js/main.js', () => {
    const res = router.match('GET', { pathname: '/js/main.js' });
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'main.js' });
    expect(res[1][0]).toEqual('main.js');
    expect(res[1][1]).toEqual({});
  });

  test('GET /js/chunk/123.js', () => {
    const res = router.match('GET', { pathname: '/js/chunk/123.js' });
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'chunk/123.js' });
  });

  test('GET /js/chunk/nest/123.js', () => {
    const res = router.match('GET', { pathname: '/js/chunk/nest/123.js' });
    expect(res[0][0]).toEqual('any file');
    expect(res[0][1]).toEqual({ filename: 'chunk/nest/123.js' });
  });
});

describe('REST API', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/users/:username([a-z]+)' }, 'profile');
  router.add('GET', { pathname: '/users/:username([a-z]+)/posts' }, 'posts');

  test('GET /users/aui', () => {
    const res = router.match('GET', { pathname: '/users/aui' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('profile');
  });

  test('GET /users/aui/posts', () => {
    const res = router.match('GET', { pathname: '/users/aui/posts' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('posts');
  });
});

describe('duplicate param name', () => {
  test('self', () => {
    const router = new URLPatternRouter<string>();
    expect(() => {
      router.add('GET', { pathname: '/:id/:id' }, 'foo');
    }).toThrow(UnsupportedPathError);
  });

  test('parent', () => {
    const router = new URLPatternRouter<string>();
    router.add('GET', { pathname: '/:id/:action' }, 'foo');
    router.add('GET', { pathname: '/posts/:id' }, 'bar');
    const res = router.match('GET', { pathname: '/posts/get' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('foo');
    expect(res[0][1]['id']).toBe('posts');
    expect(res[0][1]['action']).toBe('get');
    expect(res[1][0]).toEqual('bar');
    expect(res[1][1]['id']).toBe('get');
  });

  test('child', () => {
    const router = new URLPatternRouter<string>();
    router.add('GET', { pathname: '/posts/:id' }, 'foo');
    router.add('GET', { pathname: '/:id/:action' }, 'bar');
    const res = router.match('GET', { pathname: '/posts/get' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('foo');
    expect(res[0][1]['id']).toBe('get');
    expect(res[1][0]).toEqual('bar');
    expect(res[1][1]['id']).toBe('posts');
    expect(res[1][1]['action']).toBe('get');
  });

  test('hierarchy', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/posts/:id/comments/:comment_id' }, 'foo');
    expect(() => {
      router.add('get', { pathname: '/posts/:id' }, 'bar');
    }).not.toThrow();
  });

  test('regular expression', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/:id/:action{create|update}' }, 'foo');
    expect(() => {
      router.add('get', { pathname: '/:id/:action{delete}' }, 'bar');
    }).not.toThrow();
  });
});

describe('sort order', () => {
  describe('basic', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '*' }, 'a');
    router.add('get', { pathname: '/page' }, '/page');
    router.add('get', { pathname: '/:slug' }, '/:slug');

    test('GET /page', () => {
      const res = router.match('get', { pathname: '/page' });
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('/page');
      expect(res[2][0]).toEqual('/:slug');
    });
  });

  describe('with named path', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '*' }, 'a');
    router.add('get', { pathname: '/posts/:id' }, '/posts/:id');
    router.add('get', { pathname: '/:type/:id' }, '/:type/:id');

    test('GET /posts/123', () => {
      const res = router.match('get', { pathname: '/posts/123' });
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('/posts/:id');
      expect(res[2][0]).toEqual('/:type/:id');
    });
  });

  describe('with wildcards', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/api/*' }, '1st');
    router.add('get', { pathname: '/api/*' }, '2nd');
    router.add('get', { pathname: '/api/posts/:id' }, '3rd');
    router.add('get', { pathname: '/api/*' }, '4th');

    test('GET /api/posts/123', () => {
      const res = router.match('get', { pathname: '/api/posts/123' });
      expect(res.length).toBe(4);
      expect(res[0][0]).toEqual('1st');
      expect(res[1][0]).toEqual('2nd');
      expect(res[2][0]).toEqual('3rd');
      expect(res[3][0]).toEqual('4th');
    });
  });

  describe('with special wildcard', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/posts' }, '/posts'); // 1.1
    router.add('get', { pathname: '/posts/*' }, '/posts/*'); // 1.2
    router.add('get', { pathname: '/posts/:id' }, '/posts/:id'); // 2.3

    test('GET /posts', () => {
      const res = router.match('get', { pathname: '/posts' });

      expect(res.length).toBe(1);
      expect(res[0][0]).toEqual('/posts');
    });
  });

  describe('complex', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/api' }, 'a'); // not match
    router.add('get', { pathname: '/api/*' }, 'b'); // match
    router.add('get', { pathname: '/api/:type' }, 'c'); // not match
    router.add('get', { pathname: '/api/:type/:id' }, 'd'); // match
    router.add('get', { pathname: '/api/posts/:id' }, 'e'); // match
    router.add('get', { pathname: '/api/posts/123' }, 'f'); // match
    router.add('get', { pathname: '/*/*/:id' }, 'g'); // match
    router.add('get', { pathname: '/api/posts/*/comment' }, 'h'); // not match
    router.add('get', { pathname: '*' }, 'i'); // match
    router.add('get', { pathname: '*' }, 'j'); // match

    test('GET /api/posts/123', () => {
      const res = router.match('get', { pathname: '/api/posts/123' });
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
    router.add('get', { pathname: '*' }, 'GET *'); // 0.1
    router.add('get', { pathname: '/abc/*' }, 'GET /abc/*'); // 1.2
    router.add('get', { pathname: '/abc/edf' }, 'GET /abc/edf'); // 2.3
    router.add('get', { pathname: '/abc/*/ghi/jkl' }, 'GET /abc/*/ghi/jkl'); // 4.4
    test('GET /abc/edf', () => {
      const res = router.match('get', { pathname: '/abc/edf' });
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('GET *');
      expect(res[1][0]).toEqual('GET /abc/*');
      expect(res[2][0]).toEqual('GET /abc/edf');
    });
  });

  describe('multi match', () => {
    const router = new URLPatternRouter<string>();

    router.add('get', { pathname: '/api/*' }, 'a'); // 2.1 for /api/entry
    router.add('get', { pathname: '/api/entry' }, 'entry'); // 2.2
    router.add('ALL', { pathname: '/api/*' }, 'b'); // 2.3 for /api/entry

    test('GET /api/entry', async () => {
      const res = router.match('get', { pathname: '/api/entry' });
      expect(res.length).toBe(3);
      expect(res[0][0]).toEqual('a');
      expect(res[1][0]).toEqual('entry');
      expect(res[2][0]).toEqual('b');
    });
  });

  describe('fallback', () => {
    describe('blog - failed', () => {
      const router = new URLPatternRouter<string>();
      router.add('post', { pathname: '/entry' }, 'post entry'); // 1.1
      router.add('post', { pathname: '/entry/*' }, 'fallback'); // 1.2
      router.add('get', { pathname: '/entry/:id' }, 'get entry'); // 2.3
      test('POST /entry', async () => {
        const res = router.match('post', { pathname: '/entry' });
        expect(res.length).toBe(1);
        expect(res[0][0]).toEqual('post entry');
      });
    });
  });
  describe('page', () => {
    const router = new URLPatternRouter<string>();
    router.add('get', { pathname: '/page' }, 'page'); // 1.1
    router.add('ALL', { pathname: '/*' }, 'fallback'); // 1.2
    test('GET /page', async () => {
      const res = router.match('get', { pathname: '/page' });
      expect(res.length).toBe(2);
      expect(res[0][0]).toEqual('page');
      expect(res[1][0]).toEqual('fallback');
    });
  });
});

describe('star', () => {
  const router = new URLPatternRouter<string>();
  router.add('get', { pathname: '/' }, '/');
  router.add('get', { pathname: '/*' }, '/*');
  router.add('get', { pathname: '*' }, '*');

  router.add('get', { pathname: '/x' }, '/x');
  router.add('get', { pathname: '/x/*' }, '/x/*');

  test('top', async () => {
    const res = router.match('get', { pathname: '/' });
    expect(res.length).toBe(3);
    expect(res[0][0]).toEqual('/');
    expect(res[1][0]).toEqual('/*');
    expect(res[2][0]).toEqual('*');
  });

  test('under a certain path', async () => {
    const res = router.match('get', { pathname: '/x' });
    expect(res.length).toBe(3);
    expect(res[0][0]).toEqual('/*');
    expect(res[1][0]).toEqual('*');
    expect(res[2][0]).toEqual('/x');
    //expect(res[3][0]).toEqual("/x/*");
  });
});

describe('routing order with named parameters', () => {
  const router = new URLPatternRouter<string>();
  router.add('get', { pathname: '/book/a' }, 'no-slug');
  router.add('get', { pathname: '/book/:slug' }, 'slug');
  router.add('get', { pathname: '/book/b' }, 'no-slug-b');
  test('/book/a', () => {
    const res = router.match('get', { pathname: '/book/a' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('no-slug');
    expect(res[0][1]).toEqual({});
    expect(res[1][0]).toEqual('slug');
    expect(res[1][1]['slug']).toBe('a');
  });

  test('/book/foo', () => {
    const res = router.match('get', { pathname: '/book/foo' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('foo');
  });
  test('/book/b', () => {
    const res = router.match('get', { pathname: '/book/b' });
    expect(res.length).toBe(2);
    expect(res[0][0]).toEqual('slug');
    expect(res[0][1]['slug']).toBe('b');
    expect(res[1][0]).toEqual('no-slug-b');
    expect(res[1][1]).toEqual({});
  });
});

describe('routing with a hostname', () => {
  const router = new URLPatternRouter<string>();
  router.add('get', { pathname: 'www1.example.com/hello' }, 'www1');
  router.add('get', { pathname: 'www2.example.com/hello' }, 'www2');
  test('GET www1.example.com/hello', () => {
    const res = router.match('get', { pathname: 'www1.example.com/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('www1');
  });
  test('GET www2.example.com/hello', () => {
    const res = router.match('get', { pathname: 'www2.example.com/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('www2');
  });
  test('GET /hello', () => {
    const res = router.match('get', { pathname: '/hello' });
    expect(res.length).toBe(0);
  });
});

describe('params encoding', () => {
  const router = new URLPatternRouter<string>();
  router.add('GET', { pathname: '/user/:id' }, 'get user');

  test('should decode encoded params', () => {
    const res = router.match('GET', { pathname: '/user/%E4%BD%A0%E5%A5%BD' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get user');
    expect(res[0][1]['id']).toBe('你好');
  });

  test('should handle params without encoding', () => {
    const res = router.match('GET', { pathname: '/user/hello' });
    expect(res.length).toBe(1);
    expect(res[0][0]).toEqual('get user');
    expect(res[0][1]['id']).toBe('hello');
  });
});
