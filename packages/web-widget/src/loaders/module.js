/* global window, Blob, URL */
import { SANDBOX } from '../applications/symbols.js';

let index = 0;
const CACHE_NAME = 'WebWidgetModuleCache';

function getModuleValue(module) {
  return module.default || module;
}

// export async function moduleLoader({ src, text }) {
//   if (src) {
//     return import(/* webpackIgnore: true */ src).then(getModuleValue);
//   }

//   const blob = new Blob([text], { type: 'application/javascript' });
//   const url = URL.createObjectURL(blob);

//   return import(/* webpackIgnore: true */ url).then(
//     module => {
//       URL.revokeObjectURL(url);
//       return getModuleValue(module);
//     },
//     error => {
//       URL.revokeObjectURL(url);
//       throw error;
//     }
//   );
// }

export async function moduleLoader(view) {
  const { src, text, sandboxed } = view;
  const defaultView = sandboxed ? view[SANDBOX].window : window;
  const cache = (defaultView[CACHE_NAME] =
    defaultView[CACHE_NAME] || new Map());

  if (src && cache.has(src)) {
    return cache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const callbackName = `${CACHE_NAME}Temp${index++}`;
    let script = defaultView.document.createElement('script');

    const code = src
      ? `window[${JSON.stringify(callbackName)}] = import(${JSON.stringify(
          src
        )})`
      : `
      const url = URL.createObjectURL(new Blob(
        [${JSON.stringify(text)}],
        { type: 'application/javascript' }
      ));
      window[${JSON.stringify(callbackName)}] = import(url).then(module => {
        URL.revokeObjectURL(url);
        return module;
      }, error => {
        URL.revokeObjectURL(url);
        throw error;
      })`;

    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const clean = () => {
      delete defaultView[callbackName];
      script.parentNode.removeChild(script);
      script = null;
      URL.revokeObjectURL(url);
    };

    script.type = 'module';
    script.src = url;

    script.onload = () => {
      defaultView[callbackName].then(module => resolve(module), reject);
      clean();
    };

    script.onerror = error => {
      reject(error);
      clean();
    };

    defaultView.document.head.appendChild(script);
  }).then(module => getModuleValue(module));

  if (src) {
    cache.set(
      src,
      promise.catch(error => {
        cache.delete(src);
        throw error;
      })
    );
  }

  return promise;
}