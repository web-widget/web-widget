// Based on the code in the MIT licensed `koa-compose` package.
import type {
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareHandlers,
  MiddlewareNext,
  RouteHandler,
  RouteHandlers,
} from '@web-widget/schema';

type ComposedHandler<Content, Next, Result> = (
  context: Content,
  next?: Next
) => Promise<Result>;

// Based on the code in the MIT licensed `koa-compose` package.
export function compose<
  Handler = Function,
  Context = any,
  Next = Function,
  Result = Response,
>(
  middlewares: Handler[],
  each?: (value: Handler, index: number, array: Handler[]) => Function
): ComposedHandler<Context, Next, Result> {
  if (!Array.isArray(middlewares)) {
    throw new TypeError('Middleware stack must be an array.');
  }

  if (!each) {
    for (const fn of middlewares) {
      if (typeof fn !== 'function') {
        throw new TypeError('Middleware must be composed of functions.');
      }
    }
  }

  return (context, next) => {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number): Promise<Result> {
      if (i <= index) {
        throw new Error('next() called multiple times.');
      }
      index = i;
      let handler;

      if (middlewares[i]) {
        handler = each ? each(middlewares[i], i, middlewares) : middlewares[i];
      } else if (i === middlewares.length) {
        handler = next;
      }

      if (handler) {
        return (handler as Function)(context, () => {
          return dispatch(i + 1);
        });
      } else {
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
        }) as Result;
      }
    }
  };
}

export function composeMiddleware(
  middlewares: (MiddlewareHandler | MiddlewareHandlers)[],
  disallowUnknownMethod?: boolean
) {
  if (!Array.isArray(middlewares)) {
    throw new TypeError('Middleware stack must be an array.');
  }
  const fns: MiddlewareHandler[] = middlewares.map((fn) => {
    const type = typeof fn;
    if (type === 'function') {
      return fn as MiddlewareHandler;
    } else if (fn && type === 'object') {
      return methodsToHandler(fn as MiddlewareHandlers, disallowUnknownMethod);
    }
    throw new TypeError('Middleware must be composed of functions.');
  });

  return compose<MiddlewareHandler, MiddlewareContext, MiddlewareNext>(fns);
}

export function methodsToHandler<T extends RouteHandlers>(
  methods: T,
  disallowUnknownMethod?: boolean
): RouteHandler;

export function methodsToHandler<T extends MiddlewareHandlers>(
  methods: T,
  disallowUnknownMethod?: boolean
): MiddlewareHandler;

export function methodsToHandler(
  methods: RouteHandlers | MiddlewareHandlers,
  disallowUnknownMethod?: boolean
): RouteHandler | MiddlewareHandler {
  if (!methods || typeof methods !== 'object') {
    throw new TypeError('Method stack must be an object.');
  }

  for (const fn of Object.values(methods)) {
    if (typeof fn !== 'function') {
      throw new TypeError('Method must be composed of functions.');
    }
  }

  const mergedMethods = { ...methods };
  if (mergedMethods.GET && !mergedMethods.HEAD) {
    const GET = mergedMethods.GET;
    mergedMethods.HEAD = async function HEAD() {
      const [context, next] = arguments;
      const resp = await GET(context, next);

      if (!resp.body?.locked) {
        resp.body?.cancel();
      }

      return new Response(null, {
        headers: resp.headers,
        status: resp.status,
        statusText: resp.statusText,
      });
    };
  }

  return (context, next) => {
    const request = context.request;

    // If not overridden, HEAD requests should be handled as GET requests but without the body.
    if (request.method === 'HEAD' && !mergedMethods['HEAD']) {
      // @ts-ignore
      context.request = new Request(request.url, {
        method: 'GET',
        headers: request.headers,
      });
    }

    const handler =
      Reflect.get(mergedMethods, request.method) ??
      (disallowUnknownMethod
        ? () =>
            new Response(null, {
              status: 405,
              statusText: 'Method Not Allowed',
              headers: {
                Accept: Object.keys(mergedMethods).join(', '),
              },
            })
        : next);

    return handler(context, next);
  };
}
