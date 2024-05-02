import { userAgentFromString } from '@edge-runtime/user-agent';
import { headers as requestHeaders } from './headers';

export {
  /** @deprecated */
  isBot,
  userAgentFromString,
} from '@edge-runtime/user-agent';

const MOBILE_REGEX =
  /phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera mini|avantgo|mobilesafari|docomo|KAIOS/i;
const TABLET_REGEX =
  /ipad|playbook|(?:android|bb\d+|meego|silk)(?! .+? mobile)/i;

/**
 * Determine the device type based on the User-Agent header.
 * - Mobile: `(?:phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera\ mini|avantgo|mobilesafari|docomo|KAIOS)`
 * - Tablet: `(?:ipad|playbook|(?:android|bb\d+|meego|silk)(?! .+? mobile))`
 * - Desktop: Everything else not matched above.
 * @see https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/create-page-rules/#cache-by-device-type-enterprise-only
 * @deprecated Use `userAgent` instead.
 */
export function deviceType(headers: Headers) {
  const userAgent = headers.get('User-Agent') || '';
  const isChMobile = headers.get('Sec-CH-UA-Mobile') === '?1';
  if (isChMobile || MOBILE_REGEX.test(userAgent)) {
    return 'mobile';
  } else if (TABLET_REGEX.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/** @deprecated Use `userAgent(headers)` instead.  */
export function userAgent(
  request: Request
): ReturnType<typeof userAgentFromString>;

/** Read HTTP incoming request user agent. */
export function userAgent(headers?: Headers | Request) {
  if (headers instanceof Request) {
    return userAgentFromString(headers.headers.get('user-agent') ?? undefined);
  }
  return userAgentFromString(
    (headers ?? requestHeaders()).get('user-agent') ?? undefined
  );
}
