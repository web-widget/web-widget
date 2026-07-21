import type { Plugin } from 'vite';
import { CSS_MODULE_RE } from '@/internal/module-id';
import type { RouterPluginHost } from '@/router/host';

/** Inlined to avoid pulling Vite runtime exports into Jest. */
function applyToClientEnvironment(): Plugin['applyToEnvironment'] {
  return (environment) => environment.config.consumer === 'client';
}

export const STABLE_DEV_CSS_MODULE_NAME = '[name]_[local]_[hash:base64:5]';

export function createStableDevCssModulesPlugin(
  host: RouterPluginHost
): Plugin {
  return {
    name: '@web-widget:stable-dev-css-modules',
    apply: 'serve',
    enforce: 'post',
    applyToEnvironment: applyToClientEnvironment(),

    transform(code, id) {
      if (
        !host.state.stableDevCssModuleNames ||
        !CSS_MODULE_RE.test(id) ||
        code.includes('import.meta.hot.accept(')
      ) {
        return;
      }

      // Vite does not self-accept CSS Modules because their JS exports may
      // change. Stable dev class names make declaration-only updates safe and
      // keep HMR from propagating into widgets without framework boundaries.
      return `${code}\nimport.meta.hot.accept();`;
    },

    hotUpdate({ modules }) {
      if (!host.state.stableDevCssModuleNames) return;

      const cssModules = [];
      for (const mod of modules) {
        const id = mod.id ?? mod.file;
        if (!id || !CSS_MODULE_RE.test(id)) continue;

        // The accept call is appended after Vite's import-analysis plugin has
        // recorded HMR metadata, so keep the module graph in sync explicitly.
        mod.isSelfAccepting = true;
        cssModules.push(mod);
      }

      return cssModules.length > 0 ? cssModules : undefined;
    },
  };
}
