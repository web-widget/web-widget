import type { Status } from './status';

/**
 * `redirect()` can Redirect, default status code is 302.
 * @example
 * ```ts
 * redirect('/')
 * redirect('/', 301)
 * ```
 */
export function redirect(location: string, status: Status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: location,
    },
  });
}
