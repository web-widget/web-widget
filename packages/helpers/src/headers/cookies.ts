import { RequestCookies, ResponseCookies } from '@edge-runtime/cookies';
import { headers as requestHeaders } from './headers';

export {
  RequestCookies,
  ResponseCookies,
  parseCookie,
  parseSetCookie,
  stringifyCookie,
} from '@edge-runtime/cookies';

/** Write HTTP outgoing response cookies. */
export function cookies(headers: Headers): ResponseCookies;

/** Read HTTP incoming request cookies. */
export function cookies(): RequestCookies;

export function cookies(headers?: Headers) {
  return headers
    ? new ResponseCookies(headers)
    : new RequestCookies(requestHeaders());
}
