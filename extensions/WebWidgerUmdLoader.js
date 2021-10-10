/* global window, document, HTMLWebWidgetElement */

const CACHE = new Map();
function loader({ src, text, name }) {
  if (!name) {
    throw Error(`Must have the name of the module`);
  }
  if (src) {
    if (!CACHE.has(src)) {
      CACHE.set(
        src,
        new Promise((resolve, reject) => {
          let script = document.createElement('script');
          script.src = src;

          script.onload = () => {
            const module = window[name];
            if (module === undefined) {
              reject(new TypeError(`No global variable found: ${name}`));
            } else {
              resolve(module.default || module);
            }
          };

          script.onerror = error => {
            delete CACHE[src];
            reject(error);
          };

          document.head.appendChild(script);
          script = null;
        })
      );
    }

    return CACHE.get(src);
  }

  // eslint-disable-next-line no-new-func
  return new Function(
    `'use strict';
      ${text};
      return ${name};`
  )();
}

HTMLWebWidgetElement.loaders.define('umd', loader);
