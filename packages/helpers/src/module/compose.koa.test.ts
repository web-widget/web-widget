// Based on the code in the MIT licensed `koa-compose` package.
// @see https://github.com/koajs/compose/blob/master/test/test.js
import { compose } from './compose';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms || 1));
}

type Handler<
  Content = unknown,
  Next = () => Promise<Response>,
  Result = Response,
> = (context: Content, next: Next) => Promise<Result>;

describe('`koa-compose` test cases', () => {
  test('should work', async () => {
    const array: number[] = [];
    const stack: Handler[] = [];

    stack.push(async (_context, next) => {
      array.push(1);
      await wait(1);
      const res = await next();
      await wait(1);
      array.push(6);
      return res;
    });

    stack.push(async (_context, next) => {
      array.push(2);
      await wait(1);
      const res = await next();
      await wait(1);
      array.push(5);
      return res;
    });

    stack.push(async (_context, next) => {
      array.push(3);
      await wait(1);
      const res = await next();
      await wait(1);
      array.push(4);
      return res;
    });

    await compose(stack)({});
    expect(array).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]));
  });

  test('should be able to be called twice', () => {
    const stack: Handler<{
      array: number[];
    }>[] = [];

    stack.push(async (context, next) => {
      context.array.push(1);
      await wait(1);
      const res = await next();
      await wait(1);
      context.array.push(6);
      return res;
    });

    stack.push(async (context, next) => {
      context.array.push(2);
      await wait(1);
      const res = await next();
      await wait(1);
      context.array.push(5);
      return res;
    });

    stack.push(async (context, next) => {
      context.array.push(3);
      await wait(1);
      const res = await next();
      await wait(1);
      context.array.push(4);
      return res;
    });

    const fn = compose(stack);
    const ctx1 = { array: [] };
    const ctx2 = { array: [] };
    const out = [1, 2, 3, 4, 5, 6];

    return fn(ctx1)
      .then(() => {
        expect(out).toEqual(ctx1.array);
        return fn(ctx2);
      })
      .then(() => {
        expect(out).toEqual(ctx2.array);
      });
  });

  test('should only accept an array', () => {
    expect(() => compose(undefined as any)).toThrowError(TypeError);
  });

  test('should create next functions that return a Promise', function () {
    const stack: Handler[] = [];
    const array: Promise<Response>[] = [];
    for (let i = 0; i < 5; i++) {
      stack.push((_context, next) => {
        const res = next();
        array.push(res);
        return res;
      });
    }

    compose(stack)({});

    for (const next of array) {
      expect(next).toBeInstanceOf(Promise);
    }
  });

  test('should work with 0 middleware', function () {
    return compose([])({});
  });

  test('should only accept middleware as functions', () => {
    expect(() => compose([{}])).toThrowError(TypeError);
  });

  test('should work when yielding at the end of the stack', async () => {
    const stack: Handler[] = [];
    let called = false;

    stack.push(async (_ctx, next) => {
      const res = await next();
      called = true;
      return res;
    });

    await compose(stack)({});
    expect(called).toBe(true);
  });

  test('should reject on errors in middleware', () => {
    const stack = [];

    stack.push(() => {
      throw new Error();
    });

    return compose(stack)({}).then(
      () => {
        throw new Error('promise was not rejected');
      },
      (e) => {
        expect(e).toBeInstanceOf(Error);
      }
    );
  });

  test('should keep the context', () => {
    const ctx = {};

    const stack: Handler[] = [];

    stack.push(async (ctx2, next) => {
      const res = await next();
      expect(ctx2).toEqual(ctx);
      return res;
    });

    stack.push(async (ctx2, next) => {
      const res = await next();
      expect(ctx2).toEqual(ctx);
      return res;
    });

    stack.push(async (ctx2, next) => {
      const res = await next();
      expect(ctx2).toEqual(ctx);
      return res;
    });

    return compose(stack)(ctx);
  });

  test('should catch downstream errors', async () => {
    const array: number[] = [];
    const stack: Handler[] = [];

    stack.push(async (_ctx, next) => {
      let res;
      array.push(1);
      try {
        array.push(6);
        res = await next();
        array.push(7);
      } catch (err) {
        array.push(2);
        res = new Response(null, {
          status: 500,
        });
      }
      array.push(3);
      return res;
    });

    stack.push(async (_ctx, _next) => {
      array.push(4);
      throw new Error();
    });

    await compose(stack)({});
    expect(array).toEqual([1, 6, 4, 2, 3]);
  });

  test('should compose w/ next', () => {
    let called = false;

    return compose([])({}, async () => {
      called = true;
    }).then(function () {
      expect(called).toBe(true);
    });
  });

  test('should handle errors in wrapped non-async functions', () => {
    const stack = [];

    stack.push(function () {
      throw new Error();
    });

    return compose(stack)({}).then(
      () => {
        throw new Error('promise was not rejected');
      },
      (e) => {
        expect(e).toBeInstanceOf(Error);
      }
    );
  });

  // https://github.com/koajs/compose/pull/27#issuecomment-143109739
  test('should compose w/ other compositions', () => {
    const called: number[] = [];

    return compose([
      compose([
        (_ctx, next) => {
          called.push(1);
          return next();
        },
        (_ctx, next) => {
          called.push(2);
          return next();
        },
      ] as Handler[]),
      (_ctx, next) => {
        called.push(3);
        return next();
      },
    ] as Handler[])({}).then(() => expect(called).toEqual([1, 2, 3]));
  });

  test('should throw if next() is called multiple times', () => {
    return compose([
      async (_ctx, next) => {
        await next();
        return await next();
      },
    ] as Handler[])({}).then(
      () => {
        throw new Error('boom');
      },
      (err) => {
        expect(/multiple times/.test(err.message)).toBe(true);
      }
    );
  });

  test('should return a valid middleware', () => {
    let val = 0;
    return compose([
      compose([
        (_ctx, next) => {
          val++;
          return next();
        },
        (_ctx, next) => {
          val++;
          return next();
        },
      ] as Handler[]),
      (_ctx, next) => {
        val++;
        return next();
      },
    ] as Handler[])({}).then(function () {
      expect(val).toEqual(3);
    });
  });

  test('should return last return value', () => {
    const stack: Handler[] = [];

    stack.push(async (_context, next) => {
      const val = await next();
      expect(val).toEqual(2);
      return 1 as any;
    });

    stack.push(async (_context, next) => {
      const val = await next();
      expect(val).toEqual(0);
      return 2 as any;
    });

    const next = () => 0;
    return compose(stack)({}, next).then(function (val) {
      expect(val).toEqual(1);
    });
  });

  test('should not affect the original middleware array', () => {
    const middleware: Handler[] = [];
    const fn1: Handler = (_ctx, next) => {
      return next();
    };
    middleware.push(fn1);

    for (const fn of middleware) {
      expect(fn).toBe(fn1);
    }

    compose(middleware);

    for (const fn of middleware) {
      expect(fn).toBe(fn1);
    }
  });

  test('Should not get stuck on the passed in next', () => {
    const middleware: Handler<{
      middleware: number;
      next: number;
    }>[] = [
      (ctx, next) => {
        ctx.middleware++;
        return next();
      },
    ];
    const ctx = {
      middleware: 0,
      next: 0,
    };

    return compose(middleware)(ctx, ((ctx, next) => {
      ctx.next++;
      return next();
    }) as Handler<{
      middleware: number;
      next: number;
    }>).then(() => {
      expect(ctx).toEqual({ middleware: 1, next: 1 });
    });
  });
});
