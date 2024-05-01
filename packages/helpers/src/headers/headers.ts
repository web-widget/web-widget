import { context } from '@web-widget/context';

/** Read HTTP incoming request headers. */
export function headers() {
  const { request } = context();
  return request.headers;
}
