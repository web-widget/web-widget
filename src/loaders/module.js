/* global Blob, URL */
function getModuleValue(module) {
  return module.default || module;
}

export async function moduleLoader({ src, text }) {
  if (src) {
    return import(/* webpackIgnore: true */ src).then(getModuleValue);
  }

  const blob = new Blob([text], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  return import(/* webpackIgnore: true */ url).then(
    module => {
      URL.revokeObjectURL(url);
      return getModuleValue(module);
    },
    error => {
      URL.revokeObjectURL(url);
      throw error;
    }
  );
}
