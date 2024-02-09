type ComposedHandler<Content, Next> = (
  context: Content,
  next?: Next
) => Promise<Response>;

// Based on the code in the MIT licensed `koa-compose` package.
export function compose<Handler = Function, Context = any, Next = Function>(
  middleware: Handler[],
  each?: (value: Handler, index: number, array: Handler[]) => Function
): ComposedHandler<Context, Next> {
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
        handler = each ? each(middleware[i], i, middleware) : middleware[i];
      } else if (i === middleware.length) {
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
        });
      }
    }
  };
}
