/* global HTMLScriptElement */

// @see https://github.com/WICG/import-maps#feature-detection
const supportsImportMaps =
  HTMLScriptElement.supports && HTMLScriptElement.supports('importmap');

function getModuleValue(module) {
  return module.default || module;
}

function importModule(target) {
  if (!supportsImportMaps && typeof importShim === 'function') {
    // @see https://github.com/guybedford/es-module-shims
    // eslint-disable-next-line no-undef
    return importShim(target);
  }
  return import(/* @vite-ignore */ /* webpackIgnore: true */ target);
}

export async function moduleLoader(view) {
  const nameOrPath = view.import || view.src;
  return importModule(nameOrPath).then(getModuleValue);
}
