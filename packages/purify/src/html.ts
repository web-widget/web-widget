import { replace } from './replace';

// This utility is based on https://github.com/component/escape-html
// License: https://github.com/component/escape-html/blob/master/LICENSE
const MATCH_HTML_REGEXP = /["'&<>]/;

/**
 * Escape special characters in the given string of html.
 */
export function escapeHtml(string: string): string {
  return replace(string, MATCH_HTML_REGEXP, (code) => {
    switch (code) {
      case 34: // "
        return '&quot;';
      case 38: // &
        return '&amp;';
      case 39: // '
        return '&#39;';
      case 60: // <
        return '&lt;';
      case 62: // >
        return '&gt;';
      default:
        return undefined;
    }
  });
}
