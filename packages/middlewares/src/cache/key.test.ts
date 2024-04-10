import { CANNOT_INCLUDE_HEADERS, createKeyGenerator } from './key';

test('base: host + pathname + search', async () => {
  const keyGenerator = createKeyGenerator({
    host: true,
    pathname: true,
    search: true,
  });
  const key = await keyGenerator(new Request('http://localhost/?a=1'));
  expect(key).toBe('localhost/?a=1');
});

test('should support built-in rules', async () => {
  const keyGenerator = createKeyGenerator(
    {
      cookie: true,
      device: true,
      header: {
        include: ['x-id'],
      },
      host: true,
      method: true,
      pathname: true,
      search: true,
      very: true,
    },
    {},
    ['x-a', 'x-b']
  );
  const key = await keyGenerator(
    new Request('http://localhost/?a=1', {
      method: 'GET',
      headers: {
        cookie: 'a=1',
        'X-ID': 'abc',
        'x-a': 'a',
        'x-b': 'b',
      },
    })
  );
  expect(key).toBe(
    'localhost/?a=1#a=356a19:desktop:x-id=a9993e:GET:x-a=86f7e4&x-b=e9d71f'
  );
});

test('should support filtering', async () => {
  const keyGenerator = createKeyGenerator({
    host: {
      include: ['localhost'],
    },
    pathname: true,
    search: { include: ['a'] },
    header: { include: ['x-id'] },
  });
  const key = await keyGenerator(
    new Request('http://localhost/?a=1&b=2', {
      headers: {
        accept: 'application/json',
        'x-id': 'abc',
      },
    })
  );
  expect(key).toBe('localhost/?a=1#x-id=a9993e');
});

test('should support presence or absence without including its actual value', async () => {
  const keyGenerator = createKeyGenerator({
    host: true,
    pathname: true,
    search: { include: ['a', 'b'], checkPresence: ['a'] },
  });
  const key = await keyGenerator(new Request('http://localhost/?a=1&b=2'));
  expect(key).toBe('localhost/?a&b=2');
});

describe('should support cookie', () => {
  test('the value should be hashed', async () => {
    const keyGenerator = createKeyGenerator({
      cookie: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          cookie: 'a=hello',
        },
      })
    );
    expect(key).toBe('#a=aaf4c6');
  });

  test('should be sorted', async () => {
    const keyGenerator = createKeyGenerator({
      cookie: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          cookie: 'b=2;a=1;c=3',
        },
      })
    );
    expect(key).toBe('#a=356a19&b=da4b92&c=77de68');
  });

  test('should support filtering', async () => {
    expect(
      await createKeyGenerator({
        cookie: { include: ['a'] },
      })(
        new Request('http://localhost/', {
          headers: {
            cookie: 'a=1;b=2;c=3',
          },
        })
      )
    ).toBe('#a=356a19');

    expect(
      await createKeyGenerator({
        cookie: { exclude: ['a'] },
      })(
        new Request('http://localhost/', {
          headers: {
            cookie: 'a=1;b=2;c=3',
          },
        })
      )
    ).toBe('#b=da4b92&c=77de68');
  });

  test('should support check presence', async () => {
    const keyGenerator = createKeyGenerator({
      cookie: { include: ['a', 'b', 'c'], checkPresence: ['a'] },
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          cookie: 'a=1;b=2;c=3',
        },
      })
    );
    expect(key).toBe('#a&b=da4b92&c=77de68');
  });
});

describe('should support device', () => {
  test('default device type', async () => {
    const keyGenerator = createKeyGenerator({
      device: true,
    });
    const key = await keyGenerator(new Request('http://localhost/'));
    expect(key).toBe('#desktop');
  });

  test('desktop device type', async () => {
    const keyGenerator = createKeyGenerator({
      device: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        },
      })
    );
    expect(key).toBe('#desktop');
  });

  test('mobile device type', async () => {
    const keyGenerator = createKeyGenerator({
      device: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        },
      })
    );
    expect(key).toBe('#mobile');
  });

  test('tablet device type', async () => {
    const keyGenerator = createKeyGenerator({
      device: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPad; CPU iPad OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        },
      })
    );
    expect(key).toBe('#tablet');
  });
});

describe('should support header', () => {
  test('the value should be hashed', async () => {
    const keyGenerator = createKeyGenerator({
      header: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          a: 'hello',
        },
      })
    );
    expect(key).toBe('#a=aaf4c6');
  });

  test('should be sorted', async () => {
    const keyGenerator = createKeyGenerator({
      header: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          b: '2',
          a: '1',
          c: '3',
        },
      })
    );
    expect(key).toBe('#a=356a19&b=da4b92&c=77de68');
  });

  test('should support filtering', async () => {
    expect(
      await createKeyGenerator({
        header: { include: ['a'] },
      })(
        new Request('http://localhost/', {
          headers: {
            a: '1',
            b: '2',
            c: '3',
          },
        })
      )
    ).toBe('#a=356a19');

    expect(
      await createKeyGenerator({
        header: { exclude: ['a'] },
      })(
        new Request('http://localhost/', {
          headers: {
            a: '1',
            b: '2',
            c: '3',
          },
        })
      )
    ).toBe('#b=da4b92&c=77de68');
  });

  test('should support check presence', async () => {
    const keyGenerator = createKeyGenerator({
      header: { include: ['a', 'b', 'c'], checkPresence: ['a'] },
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          b: '2',
          a: '1',
          c: '3',
        },
      })
    );
    expect(key).toBe('#a&b=da4b92&c=77de68');
  });

  test('header key should ignore case', async () => {
    const keyGenerator = createKeyGenerator({
      header: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          a: 'application/json',
          'X-ID': 'abc',
        },
      })
    );
    expect(key).toBe('#a=ca9fd0&x-id=a9993e');
  });

  test('some headers are not allowed to be included', async () => {
    CANNOT_INCLUDE_HEADERS.forEach(async (key) => {
      await expect(
        createKeyGenerator({
          header: { include: [key] },
        })(
          new Request('http://localhost/', {
            headers: {
              [key]: 'hello',
            },
          })
        )
      ).rejects.toThrow(`Cannot include header: ${key}`);
    });
  });

  test('`header` should not be used instead of `vary` rules', async () => {
    await expect(
      createKeyGenerator(
        {
          header: { include: ['x-a'] },
        },
        {},
        ['x-a']
      )(
        new Request('http://localhost/', {
          headers: {
            'x-a': 'a',
          },
        })
      )
    ).rejects.toThrow(
      `Cannot include header: x-a. Use \`very: { include: ["x-a"] }\` instead.`
    );
  });
});

describe('should support host', () => {
  test('basic', async () => {
    const keyGenerator = createKeyGenerator({
      host: true,
    });
    const key = await keyGenerator(new Request('http://localhost/'));
    expect(key).toBe('localhost');
  });

  test('should support filtering', async () => {
    const keyGenerator = createKeyGenerator({
      host: { include: ['localhost'] },
    });
    const key = await keyGenerator(new Request('http://localhost:8080/'));
    expect(key).toBe('');
  });
});

describe('should support method', () => {
  test('basic', async () => {
    const keyGenerator = createKeyGenerator({
      method: true,
    });
    const key = await keyGenerator(new Request('http://localhost/'));
    expect(key).toBe('#GET');
  });

  test('should support filtering', async () => {
    const keyGenerator = createKeyGenerator({
      method: { include: ['GET'] },
    });
    const key = await keyGenerator(
      new Request('http://localhost/', { method: 'POST' })
    );
    expect(key).toBe('#');
  });

  test('the body of the POST, PATCH and PUT methods should be used as part of the key', async () => {
    await Promise.all(
      ['POST', 'PATCH', 'PUT'].map(async (method) => {
        const keyGenerator = createKeyGenerator({
          method: true,
        });
        const key = await keyGenerator(
          new Request('http://localhost/', {
            method,
            body: 'hello',
          })
        );
        expect(key).toBe(`#${method}=aaf4c6`);
      })
    );
  });
});

describe('should support pathname', () => {
  test('basic', async () => {
    const keyGenerator = createKeyGenerator({
      pathname: true,
    });
    const key = await keyGenerator(new Request('http://localhost/a/b/c'));
    expect(key).toBe('/a/b/c');
  });

  test('should support filtering', async () => {
    const keyGenerator = createKeyGenerator({
      pathname: { include: ['/a/b/c'] },
    });
    const key = await keyGenerator(new Request('http://localhost:8080/a/b/c'));
    expect(key).toBe('/a/b/c');
  });
});

describe('should support search', () => {
  test('should be sorted', async () => {
    const keyGenerator = createKeyGenerator({
      search: true,
    });
    const key = await keyGenerator(
      new Request('http://localhost/?b=2&a=1&c=3')
    );
    expect(key).toBe('?a=1&b=2&c=3');
  });

  test('question marks should not be generated if there are no query parameters', async () => {
    const keyGenerator = createKeyGenerator({
      search: true,
    });
    const key = await keyGenerator(new Request('http://localhost/'));
    expect(key).toBe('');
  });

  test('should support filtering', async () => {
    const keyGenerator = createKeyGenerator({
      search: { include: ['a'] },
    });
    const key = await keyGenerator(
      new Request('http://localhost/?a=1&b=2&c=3')
    );
    expect(key).toBe('?a=1');
  });

  test('should support check presence', async () => {
    const keyGenerator = createKeyGenerator({
      search: { include: ['a', 'b', 'c'], checkPresence: ['a'] },
    });
    const key = await keyGenerator(
      new Request('http://localhost/?a=1&b=2&c=3')
    );
    expect(key).toBe('?a&b=2&c=3');
  });
});

describe('should support very', () => {
  test('basic', async () => {
    const keyGenerator = createKeyGenerator(
      {
        very: true,
      },
      {},
      ['x-a', 'x-b']
    );
    const key = await keyGenerator(
      new Request('http://localhost/', {
        headers: {
          'x-a': 'a',
          'x-b': 'b',
        },
      })
    );
    expect(key).toBe('#x-a=86f7e4&x-b=e9d71f');
  });
});

describe('should support custom key', () => {
  test('basic', async () => {
    const keyGenerator = createKeyGenerator(
      {
        foo: true,
      },
      {
        foo: async () => 'custom',
      }
    );
    const key = await keyGenerator(new Request('http://localhost/'));
    expect(key).toBe('#custom');
  });
});
