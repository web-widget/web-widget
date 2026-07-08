import type { Plugin } from 'vite';
import { VUE_STYLE_QUERY_RE } from '@/internal/module-id';

/** Inlined to avoid transitive `vite` ESM import issues in jest. */
function applyToServerEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => environment.config.consumer === 'server';
}

/** Matches plain `.css` files (no preprocessors like .scss/.less). */
const PLAIN_CSS_RE = /\.css$/;

/**
 * Returns `true` for IDs that are **definitely** safe to skip in SSR.
 *
 * Skipped (safe — SSR does not need their content):
 * - Plain `.css` files with no query and no `.module.` marker
 * - Vue SFC `<style>` blocks that are NOT CSS Modules
 *   (Vue plugin compiles SFC in `load`; the `?vue&type=style` sub-module
 *   only returns CSS content which SSR doesn't consume)
 *
 * NOT skipped (left to Vite's default handling):
 * - CSS Modules (`.module.css`, `?module`, `lang.module.css`) — SSR
 *   rendering needs their hashed class-name exports
 * - Any ID with a query string (`?inline`, `?url`, `?raw`, `?import`) —
 *   may need content/URL exports
 * - Preprocessor files (`.scss`, `.less`) — must run through Vite's
 *   `transform` pipeline to compile to CSS
 * - Virtual modules (`\0` prefix) — unknown content
 */
function isSkippableServerCss(id: string): boolean {
  if (id.startsWith('\0')) return false;

  // Vue SFC <style> blocks: skip unless they contain a "module" marker.
  if (VUE_STYLE_QUERY_RE.test(id)) {
    return !/module/i.test(id);
  }

  // Plain CSS files: skip only if no query and not a CSS Module.
  if (id.includes('?')) return false;
  if (/\.module\./i.test(id)) return false;
  return PLAIN_CSS_RE.test(id);
}

/**
 * Skips non-module CSS in SSR builds to avoid unnecessary CSS parsing.
 *
 * In SSR, page styles are delivered via `<link>` tags resolved from the
 * client build manifest — the server bundle does not need CSS content.
 * The only exception is CSS Modules, whose hashed class-name exports
 * are consumed by SSR render code (e.g. Vue `$style`, React
 * `styles.className`).
 *
 * This plugin intercepts `load` for skippable CSS and returns empty
 * content, bypassing Vite's CSS parse/transform/codegen pipeline.
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
