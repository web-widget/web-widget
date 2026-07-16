import { Context } from '../context';
import type {
  MiddlewareContext,
  RouteContext,
  RouteHandler,
  RouteHandlers,
  RouteModule,
} from '../types';

const HANDLER = Symbol('handler');

export function normalizeHandler<T>(
  handler: T | Record<string, unknown>,
  disallowUnknownMethod: boolean
): T {
  if (!handler) {
    throw new TypeError(`Module is missing export "handler".`);
  }
  if (typeof handler === 'function') {
    return handler as T;
  }

  const methods = handler as Record<string, unknown> & { [HANDLER]?: T };
  if (methods[HANDLER]) {
    return methods[HANDLER];
  }
  return (methods[HANDLER] = methodsToHandler<T>(
    methods,
    disallowUnknownMethod
  ));
}

export function normalizeRouteHandler(
  module: RouteModule,
  isErrorScenario = false
): RouteHandler {
  const handler =
    module.handler ??
    (isErrorScenario
      ? createDefaultErrorHandler()
      : createDefaultRouteHandler());
  return normalizeHandler<RouteHandler>(handler, true);
}

function methodsToHandler<T>(
  methods: Record<string, unknown>,
  disallowUnknownMethod: boolean
): T {
  for (const handler of Object.values(methods)) {
    if (typeof handler !== 'function') {
      throw new TypeError('Method must be composed of functions.');
    }
  }

  const mergedMethods = { ...methods };
  return ((context: MiddlewareContext, next: () => Promise<Response>) => {
    const method =
      context instanceof Context
        ? context.requestMethod
        : context.request.method;
    const handler = Reflect.get(mergedMethods, method);
    if (typeof handler === 'function') return handler(context, next);
    if (!disallowUnknownMethod) return next();
    return new Response(null, {
      status: 405,
      statusText: 'Method Not Allowed',
      headers: { Accept: Object.keys(mergedMethods).join(', ') },
    });
  }) as T;
}

function createDefaultRouteHandler(): RouteHandlers {
  return {
    GET(context: RouteContext) {
      return context.html();
    },
  };
}

function createDefaultErrorHandler(): RouteHandler {
  return (context: RouteContext) =>
    context.html(null, { error: context.error });
}
