/* global HTMLWebWidgetElement, window */

const FALLBACK_PROMISE_NAME = '__SystemPromise__';
let FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/systemjs@6/dist/s.min.js';

function getModuleValue(module) {
  return module.default || module;
}

function importScript(url, defaultView) {
  return new Promise((resolve, reject) => {
    const { document } = defaultView;
    let script = document.createElement('script');
    script.src = url;

    script.onload = () => {
      resolve();
    };

    script.onerror = error => {
      reject(error);
    };

    document.head.appendChild(script);
    script = null;
  });
}

async function loader(view) {
  const { src, text, sandboxed } = view;
  const defaultView = sandboxed ? view.sandbox.window : window;
  const { Blob, URL } = defaultView;

  if (!defaultView.System) {
    if (!defaultView[FALLBACK_PROMISE_NAME]) {
      defaultView[FALLBACK_PROMISE_NAME] = importScript(
        FALLBACK_URL,
        defaultView
      );
    }
    await defaultView[FALLBACK_PROMISE_NAME];
  }

  const System = defaultView.System;

  if (src) {
    return System.import(src).then(getModuleValue);
  }

  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/javascript' })
  );

  return System.import(url).then(
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

export function setLoaderUrl(url) {
  FALLBACK_URL = url;
}

HTMLWebWidgetElement.loaders.define('system', loader);
