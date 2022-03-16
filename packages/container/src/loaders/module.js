/* global Blob, URL, HTMLScriptElement */

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
  const { src, text, sandboxed } = view;
  const nameOrPath = view.import || src;

  if (sandboxed) {
    throw new Error(`The sandbox does not support ES module`);
  }

  if (nameOrPath) {
    return importModule(nameOrPath).then(getModuleValue);
  }

  const blob = new Blob([text], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  return importModule(url).then(
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

// let index = 0;
// export async function moduleLoader(view) {
//   const { src, text, sandboxed, sandbox } = view;
//   const defaultView = sandboxed ? sandbox.window : window;
//   const { document, Blob, URL, Error } = defaultView;
//   const cacheKey = '@WebWidgetModuleCache';
//   const cache = (defaultView[cacheKey] = defaultView[cacheKey] || new Map());
//   const nameOrPath = view.import || src;

//   if (nameOrPath && cache.has(nameOrPath)) {
//     return cache.get(nameOrPath);
//   }

//   const promise = new Promise((resolve, reject) => {
//     const callbackName = `${cacheKey}Temp${index++}`;
//     let script = document.createElement('script');

//     const code = nameOrPath
//       ? `window[${JSON.stringify(callbackName)}] = import(${JSON.stringify(
//           nameOrPath
//         )})`
//       : `
//       const url = URL.createObjectURL(new Blob(
//         [${JSON.stringify(text)}],
//         { type: 'application/javascript' }
//       ));
//       window[${JSON.stringify(callbackName)}] = import(url).then(module => {
//         URL.revokeObjectURL(url);
//         return module;
//       }, error => {
//         URL.revokeObjectURL(url);
//         throw error;
//       })`;

//     const blob = new Blob([code], { type: 'application/javascript' });
//     const url = URL.createObjectURL(blob);
//     const clean = () => {
//       delete defaultView[callbackName];
//       script.parentNode.removeChild(script);
//       script = null;
//       URL.revokeObjectURL(url);
//     };

//     script.type = 'module';
//     script.src = url;

//     script.onload = () => {
//       if (defaultView[callbackName]) {
//         defaultView[callbackName].then(module => resolve(module), reject);
//       } else {
//         reject(
//           new Error(
//             sandboxed ? `The sandbox does not support ES module` : `Load error`
//           )
//         );
//       }

//       clean();
//     };

//     script.onerror = error => {
//       reject(error);
//       clean();
//     };

//     document.head.appendChild(script);
//   })
//     .then(module => getModuleValue(module))
//     .catch(error => {
//       cache.delete(nameOrPath);
//       throw error;
//     });

//   if (nameOrPath) {
//     cache.set(nameOrPath, promise);
//   }

//   return promise;
// }
