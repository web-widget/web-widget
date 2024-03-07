import type { MiddlewareContext } from '@web-widget/helpers';
import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status } from '@web-widget/helpers/status';
import { redirect } from '@web-widget/helpers/navigation';

declare module '@web-widget/schema' {
  export interface RouteConfig {
    trailingSlash?: boolean;
  }
}

export type TrailingSlashOptions = {
  trailingSlash?: boolean;
  exclude?: (ctx: MiddlewareContext) => boolean;
};

export const trailingSlash = (options: TrailingSlashOptions) => {
  return defineMiddlewareHandler(
    async function trailingSlashMiddleware(context, next) {
      const trailingSlash =
        options.trailingSlash ?? context.module?.config?.trailingSlash;
      const url = new URL(context.request.url);
      // Redirect requests that end with a trailing slash to their non-trailing
      // slash counterpart.
      // Ex: /about/ -> /about
      if (
        url.pathname.length > 1 &&
        url.pathname.endsWith('/') &&
        !trailingSlash
      ) {
        // Remove trailing slashes
        const path = url.pathname.replace(/\/+$/, '');
        const location = `${path}${url.search}`;
        return redirect(location, Status.PermanentRedirect);
      } else if (trailingSlash && !url.pathname.endsWith('/')) {
        // If the last element of the path has a "." it's a file
        const isFile = url.pathname.split('/').at(-1)?.includes('.');

        const ignore = options.exclude?.(context) ?? false;

        if (!isFile && !ignore) {
          url.pathname += '/';
          return redirect(url.href, Status.PermanentRedirect);
        }
      }

      return next();
    }
  );
};
