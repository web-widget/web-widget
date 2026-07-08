import path from 'node:path';

import { normalizePath } from './path';

/**
 * Vite-specific regexes for CSS module id matching.
 *
 * Centralized here so dev (meta.ts), build (skip-server-css.ts), and
 * asset collection (collect-route-assets.ts) share a single source of
 * truth instead of maintaining copies.
 */

/** Matches CSS and CSS-like file extensions (Vite's CSS_LANGS_RE equivalent). */
export const CSS_LANGS_RE =
  /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/;

/** Query suffixes that make a CSS-like request non-buildable. */
export const cssExcludeRE = [/(?:\?|&)raw(?:&|$)/, /(?:\?|&)inline\b/];

/** Matches CSS Modules filenames (e.g. `foo.module.css`). */
export const CSS_MODULE_RE = /\.module\./;

/** Matches Vue SFC `<style>` sub-modules (`?vue&type=style`). */
export const VUE_STYLE_QUERY_RE = /[?&]vue&type=style/;

/** Matches Vue SFC CSS Modules sub-modules (`?module` or `lang.module.css`). */
export const VUE_CSS_MODULE_QUERY_RE = /[?&]module(=|&|$)|lang\.module\./;

/** Prefix Vite prepends to resolved ids that are not valid browser import specifiers. */
const VITE_VALID_ID_PREFIX = '/@id/';

/** Strip Vite `/@id/` prefix from a resolved module id. */
export function unwrapViteId(id: string): string {
  return id.startsWith(VITE_VALID_ID_PREFIX)
    ? id.slice(VITE_VALID_ID_PREFIX.length)
    : id;
}

/** Pathname-only module id (no query or hash). */
export function stripModuleIdQuery(id: string): string {
  const hashIndex = id.indexOf('#');
  const withoutHash = hashIndex >= 0 ? id.slice(0, hashIndex) : id;
  const queryIndex = withoutHash.indexOf('?');
  return queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
}

/** Canonical key for Vite module graph matching and manifest filter paths. */
export function canonicalModuleKey(id: string): string {
  return stripModuleIdQuery(unwrapViteId(id));
}

/** Relative manifest key for `createFilter`-based dynamic import predicates. */
export function toManifestFilterKey(id: string, root: string): string {
  return normalizePath(path.relative(root, canonicalModuleKey(id)));
}

export function normalizeFilterId(id: string) {
  const hashIndex = id.indexOf('#');
  const cleanId = hashIndex >= 0 ? id.slice(0, hashIndex) : id;
  const queryIndex = cleanId.indexOf('?');
  if (queryIndex < 0) {
    return cleanId;
  }

  const pathname = cleanId.slice(0, queryIndex);
  const query = cleanId.slice(queryIndex + 1);
  const normalizedQuery = query
    .split('&')
    .filter((part) => {
      if (!part) {
        return false;
      }
      const equalIndex = part.indexOf('=');
      const key = equalIndex >= 0 ? part.slice(0, equalIndex) : part;
      return key !== 'import' && key !== 't' && key !== 'v';
    })
    .join('&');
  return normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname;
}
