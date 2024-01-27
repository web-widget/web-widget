import { Context } from "./context";
import type { Params, Pathname } from "./router";
import type { Env, NotFoundHandler, ErrorHandler } from "./types";

interface ComposeContext {
  error?: unknown;
}

// Based on the code in the MIT licensed `koa-compose` package.
export const compose = <C extends ComposeContext, E extends Env = Env>(
  middleware: [Function, Params, Pathname][],
  onError?: ErrorHandler<E>,
  onNotFound?: NotFoundHandler<E>
) => {
  return (context: C, next?: Function) => {
    let index = -1;
    return dispatch(0);

    async function dispatch(i: number): Promise<Response> {
      if (i <= index) {
        throw new Error("next() called multiple times.");
      }
      index = i;

      let res;
      let handler;

      if (middleware[i]) {
        handler = middleware[i][0];
        if (context instanceof Context) {
          context.params = middleware[i][1];
          context.pathname = middleware[i][2];
        }
      } else {
        handler = (i === middleware.length && next) || undefined;
      }

      if (!handler) {
        if (context instanceof Context && onNotFound) {
          res = onNotFound(context);
        }
      } else {
        try {
          res = await handler(context, () => {
            return dispatch(i + 1);
          });
        } catch (err) {
          if (context instanceof Context && onError) {
            context.error = err;
            res = onError(err, context);
          } else {
            throw err;
          }
        }
      }

      return res;
    }
  };
};
