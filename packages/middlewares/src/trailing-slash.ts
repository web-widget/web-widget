import { defineMiddlewareHandler } from '@web-widget/helpers';
import { Status } from '@web-widget/helpers/status';
import { redirect } from '@web-widget/helpers/navigation';

export type TrailingSlashOptions = {
  trailingSlash?: boolean;
};

export const trailingSlash = (options: TrailingSlashOptions = {}) => {
  const trailingSlash = options.trailingSlash ?? false;
  return defineMiddlewareHandler(
    async function trailingSlashMiddleware(context, next) {
      const url = new URL(context.request.url);
      const { pathname, search } = url;

      // Redirect requests that end with a trailing slash to their non-trailing
      // slash counterpart.
      // Ex: /about/ -> /about
      if (pathname.length > 1 && pathname.endsWith('/') && !trailingSlash) {
        // Remove trailing slashes
        const path = pathname.replace(/\/+$/, '');
        const location = `${path}${search}`;
        return redirect(location, Status.PermanentRedirect);
      } else if (trailingSlash && !pathname.endsWith('/')) {
        // If the last element of the path has a "." it's a file
        const isFile = pathname.split('/').at(-1)?.includes('.');
        if (!isFile) {
          url.pathname += '/';
          return redirect(url.href, Status.PermanentRedirect);
        }
      }

      return next();
    }
  );
};
