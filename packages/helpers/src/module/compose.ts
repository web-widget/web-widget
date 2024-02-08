// Based on the code in the MIT licensed `koa-compose` package.
import type {
  MiddlewareContext,
  MiddlewareHandler,
  MiddlewareHandlers,
  MiddlewareNext,
  MiddlewareResult,
  RouteHandler,
  RouteHandlers,
} from '@web-widget/schema';

type ComposedHandler = (
  context: MiddlewareContext,
  next?: MiddlewareNext
) => Promise<MiddlewareResult>;

/**
 * Compose `middleware` returning a fully valid middleware comprised
 * of all those which are passed.
 */
export function composeMiddleware(
  middlewares: (MiddlewareHandler | MiddlewareHandlers)[]
): ComposedHandler {
  const fns: MiddlewareHandler[] = middlewares.map((fn) => {
    const type = typeof fn;
    if (type === 'function') {
      return fn as MiddlewareHandler;
    } else if (fn && type === 'object') {
      return methodsToHandler(fn as MiddlewareHandlers);
    }
    throw new TypeError('Middleware must be composed of functions.');
  });

  return function (context, next) {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number): Promise<MiddlewareResult> {
      if (i <= index) {
        throw new Error('next() called multiple times.');
      }
      index = i;
      let handler: MiddlewareHandler | undefined;

      if (fns[i]) {
        handler = fns[i];
      } else if (i === fns.length) {
        handler = next;
      }

      if (handler) {
        return handler(context, () => {
          return dispatch(i + 1);
        });
      } else {
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
        });
      }
    }
  };
}

export function methodsToHandler<T extends RouteHandlers>(
  methods: T
): RouteHandler;

export function methodsToHandler<T extends MiddlewareHandlers>(
  methods: T
): MiddlewareHandler;

export function methodsToHandler(
  methods: RouteHandlers | MiddlewareHandlers
): RouteHandler | MiddlewareHandler {
  if (!methods || typeof methods !== 'object') {
    throw new TypeError('Method stack must be an object.');
  }

  for (const fn of Object.values(methods)) {
    if (typeof fn !== 'function') {
      throw new TypeError('Method must be composed of functions.');
    }
  }

  if (methods.GET && !methods.HEAD) {
    const GET = methods.GET;
    methods.HEAD = async function HEAD() {
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
    let request = context.request;

    // If not overridden, HEAD requests should be handled as GET requests but without the body.
    if (request.method === 'HEAD' && !methods['HEAD']) {
      context.request = new Request(request.url, {
        method: 'GET',
        headers: request.headers,
      });
    }

    const handler =
      Reflect.get(methods, request.method) ??
      (() =>
        new Response(null, {
          status: 405,
          statusText: 'Method Not Allowed',
          headers: {
            Accept: Object.keys(methods).join(', '),
          },
        }));

    return handler(context, next);
  };
}
