import { replace } from './replace';

// This utility is based on https://github.com/zertosh/htmlescape
// License: https://github.com/zertosh/htmlescape/blob/0527ca7156a524d256101bb310a9f970f63078ad/LICENSE
const MARCH_JSON_REGEX = /[&><\u2028\u2029]/;

/**
 * Escape special characters in the given string of json.
 */
export function escapeJson(string: string): string {
  return replace(string, MARCH_JSON_REGEX, (code) => {
    switch (code) {
      case 38: // &
        return '\\u0026';
      case 62: // >
        return '\\u003e';
      case 60: // <
        return '\\u003c';
      case 8232: // \u2028
        return '\\u2028';
      case 8233: // \u2029
        return '\\u2029';
      default:
        return undefined;
    }
  });
}
