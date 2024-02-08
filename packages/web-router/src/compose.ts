import { Context } from './context';
import type { Params, Pathname } from './router';
import type { Env, NotFoundHandler, ErrorHandler } from './types';

interface ComposeContext {
  error?: unknown;
}

type ComposedHandler<C = ComposeContext> = (
  context: C,
  next?: Function
) => Promise<Response>;

// Based on the code in the MIT licensed `koa-compose` package.
export function compose<C extends ComposeContext, E extends Env = Env>(
  middleware: [Function, Params, Pathname][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
): ComposedHandler<C> {
  return (context, next) => {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number): Promise<Response> {
      if (i <= index) {
        throw new Error('next() called multiple times.');
      }
      index = i;
      let handler;

      if (middleware[i]) {
        handler = middleware[i][0];
      } else if (i === middleware.length) {
        handler = next;
      }

      if (handler) {
        if (context instanceof Context) {
          context.params = middleware[i][1];
          context.pathname = middleware[i][2];
        }
        try {
          return await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (context instanceof Context && onError) {
            context.error = err;
            return onError(err, context);
          } else {
            throw err;
          }
        }
      } else {
        if (context instanceof Context && onNotFound) {
          return onNotFound(context);
        } else {
          return new Response(null, {
            status: 404,
            statusText: 'Not Found',
          });
        }
      }
    }
  };
}
