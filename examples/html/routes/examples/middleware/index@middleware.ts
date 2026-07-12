import { defineMiddlewareHandler, mergeMeta } from '@web-widget/helpers';

export const handler = defineMiddlewareHandler(
  async function middlewareDemo(context, next) {
    // If current route is a page, there will be a meta object, middleware can add default values here
    if (context.meta) {
      context.meta = mergeMeta(context.meta, {
        title: 'Middleware - Web Widget',
        description: 'This is a middleware page...',
        keywords: 'middleware, web widget, demo',
        meta: [
          {
            name: 'hello',
            content: 'world',
          },
        ],
        script: [
          {
            content:
              'console.log("Script dynamically inserted by middleware!");',
          },
        ],
      });
    }

    // Execute next middleware/route handler
    const response = await next();

    // Add example response header
    response.headers.set('X-Powered-By', 'Web Widget Middleware Example');

    return response;
  }
);
