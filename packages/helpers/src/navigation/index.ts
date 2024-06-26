import { context } from '@web-widget/context';
import { Status, STATUS_TEXT } from '../status';

export function params<T extends Record<string, string>>(): T {
  const ctx = context();
  return ctx.params as T;
}

/** @deprecated Use `params` instead. */
export const useParams = params;

export function searchParams() {
  return url().searchParams;
}

/**
 * `redirect()` can Redirect, default status code is 307.
 * @example
 * ```ts
 * redirect('/')
 * redirect('/', 301)
 * ```
 */
export function redirect(
  location: string,
  status: Status = Status.TemporaryRedirect
): Response {
  return new Response(null, {
    status,
    statusText: STATUS_TEXT[status],
    headers: {
      Location: location,
    },
  });
}

export function url(): URL {
  const ctx = context();

  return new URL(ctx.request.url);
}

/** @deprecated Use `url` instead. */
export const useLocation = url;
