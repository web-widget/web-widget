/* global System, HTMLWebWidgetElement, Blob, URL */
function getModuleValue(module) {
  return module.default || module;
}

async function loader({ src, text }) {
  if (src) {
    return System.import(src).then(getModuleValue);
  }

  src = URL.createObjectURL(
    new Blob([text], { type: 'application/javascript' })
  );

  return System.import(src).then(
    module => {
      URL.revokeObjectURL(src);
      return getModuleValue(module);
    },
    error => {
      URL.revokeObjectURL(src);
      throw error;
    }
  );
}

HTMLWebWidgetElement.loaders.define('system', loader);
