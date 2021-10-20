/* global window, HTMLWebWidgetElement */
const CACHE_NAME = 'WebWidgetModuleCache';

function getModuleValue(module) {
  if (!module) {
    throw new Error(`No global variables exported by UMD were found`);
  }
  return module.default || module;
}

async function umdLoader(view) {
  const { src, text, sandboxed, name } = view;
  const defaultView = sandboxed ? view.sandbox.window : window;
  const { document } = defaultView;
  const cache = (defaultView[CACHE_NAME] =
    defaultView[CACHE_NAME] || new Map());

  if (!name) {
    throw new Error(`Must have the name of the module`);
  }

  if (src && cache.has(src)) {
    return cache.get(src);
  }

  const module = (
    src
      ? new Promise((resolve, reject) => {
          let script = document.createElement('script');
          script.src = src;

          script.onload = () => {
            resolve(defaultView[name]);
          };

          script.onerror = error => {
            cache.delete(src);
            reject(error);
          };

          document.head.appendChild(script);
          script = null;
        })
      : Promise.resolve(
          // eslint-disable-next-line no-new-func
          new defaultView.Function(
            `'use strict';
            ${text};
          return ${name};`
          )()
        )
  ).then(module => getModuleValue(module));

  if (src) {
    cache.set(
      src,
      module.catch(error => {
        cache.delete(src);
        throw error;
      })
    );
  }

  return module;
}

HTMLWebWidgetElement.loaders.define('umd', umdLoader);
