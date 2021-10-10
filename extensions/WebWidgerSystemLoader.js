/* global System, HTMLWebWidgetElement, Blob, URL */
function loader({ src, text }) {
  if (src) {
    return System.import(src);
  }

  src = URL.createObjectURL(
    new Blob([text], { type: 'application/javascript' })
  );

  return System.import(src).then(
    module => {
      URL.revokeObjectURL(src);
      return module;
    },
    error => {
      URL.revokeObjectURL(src);
      throw error;
    }
  );
}

HTMLWebWidgetElement.loaders.define('system', loader);
