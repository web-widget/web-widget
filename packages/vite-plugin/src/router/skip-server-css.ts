import type { Plugin } from 'vite';

/** Inlined to avoid transitive `vite` ESM import issues in jest. */
function applyToServerEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => environment.config.consumer === 'server';
}

const CSS_EXTENSION_RE = /\.(css|less|scss|sass|styl|stylus)$/;
const CSS_MODULE_RE = /\.module\./;
const VUE_STYLE_QUERY_RE = /[?&]vue&type=style/;
const VUE_CSS_MODULE_QUERY_RE = /[?&]module(=|&|$)/;

/**
 * Returns `true` when `id` is a regular (non-module) CSS file or Vue SFC
 * style block whose content is not needed during SSR. CSS Modules are
 * excluded because SSR rendering needs their class-name exports.
 */
function isSkippableServerCss(id: string): boolean {
  if (id.startsWith('\0')) return false;

  // Vue SFC <style> blocks: skip unless they are CSS Modules.
  if (VUE_STYLE_QUERY_RE.test(id)) {
    return !VUE_CSS_MODULE_QUERY_RE.test(id);
  }

  const cleanId = id.replace(/[?#].*$/, '');
  if (!CSS_EXTENSION_RE.test(cleanId)) return false;
  if (CSS_MODULE_RE.test(cleanId)) return false;
  return true;
}

/**
 * Skips non-module CSS in SSR builds. SSR delivers styles via `<link>` tags
 * from the client build manifest; only CSS Modules need processing (their
 * class-name exports are consumed by render code).
 */
export function createSkipServerCssPlugin(): Plugin {
  return {
    name: '@web-widget:skip-server-css',
    apply: 'build',
    enforce: 'pre',
    applyToEnvironment: applyToServerEnvironment(),
    sharedDuringBuild: true,
    load: {
      order: 'pre',
      // Native filter: only invoke the handler for CSS-like ids, skipping
      // CSS Modules, Vue module styles, and virtual modules at the Rust level.
      filter: {
        id: {
          include: [
            /\.(?:css|less|scss|sass|styl|stylus)(?:[?#]|$)/,
            /[?&]vue&type=style/,
          ],
          exclude: [/\.module\./, /[?&]module(=|&|$)/, /^\0/],
        },
      },
      handler(id) {
        if (isSkippableServerCss(id)) {
          return '/* web-widget: css skipped in ssr */';
        }
        return null;
      },
    },
  };
}
