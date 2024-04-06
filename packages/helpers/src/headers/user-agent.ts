export {
  isBot,
  userAgent,
  userAgentFromString,
} from '@edge-runtime/user-agent';

const MOBILE_REGEX =
  /phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera mini|avantgo|mobilesafari|docomo|KAIOS/i;
const TABLET_REGEX =
  /ipad|playbook|(?:android|bb\d+|meego|silk)(?! .+? mobile)/i;

/**
 * Determine the device type based on the User-Agent header.
 * @see https://developers.cloudflare.com/cache/how-to/edge-browser-cache-ttl/create-page-rules/#cache-by-device-type-enterprise-only
 */
export function deviceType(headers: Headers) {
  const userAgent = headers.get('User-Agent') || '';
  if (MOBILE_REGEX.test(userAgent)) {
    return 'mobile';
  } else if (TABLET_REGEX.test(userAgent)) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}
