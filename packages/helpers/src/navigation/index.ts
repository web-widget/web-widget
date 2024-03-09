import { useContext } from '@web-widget/context';
import { Status, STATUS_TEXT } from '../status';

export function useParams<T extends Record<string, string>>(): T {
  const ctx = useContext();
  return ctx.params as T;
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

export function useLocation(): URL {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ctx = useContext();

  return new URL(ctx.request.url);
}
