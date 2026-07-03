import type { Plugin } from 'vite';
import {
  CSS_LANGS_RE,
  CSS_MODULE_RE,
  VUE_STYLE_QUERY_RE,
  VUE_CSS_MODULE_QUERY_RE,
} from '@/internal/module-id';

/** Inlined to avoid transitive `vite` ESM import issues in jest. */
function applyToServerEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => environment.config.consumer === 'server';
}

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
  if (!CSS_LANGS_RE.test(cleanId)) return false;
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
      handler(id) {
        if (isSkippableServerCss(id)) {
          return '/* web-widget: css skipped in ssr */';
        }
        return null;
      },
    },
  };
}
