import { RequestCookies, ResponseCookies } from '@edge-runtime/cookies';
import { headers as requestHeaders } from './headers';

export {
  RequestCookies,
  ResponseCookies,
  parseCookie,
  parseSetCookie,
  stringifyCookie,
} from '@edge-runtime/cookies';

/** Read HTTP incoming request cookies. */
export function cookies(): RequestCookies;

/** Write HTTP outgoing response cookies. */
export function cookies(headers: Headers): ResponseCookies;

export function cookies(headers?: Headers) {
  return headers
    ? new ResponseCookies(headers)
    : new RequestCookies(requestHeaders());
}
