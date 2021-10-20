/* global HTMLWebWidgetElement, window */

const FALLBACK_PROMISE_NAME = '__SystemPromise__';
const TYPE = 'systemjs-importmap';
const SYSTEMJS_IMPORTMAP_SELECTOR = `script[type=${TYPE}]`;
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

async function getSystem(defaultView) {
  const sandboxed = window !== defaultView;

  // 载入远程的 SystemJS
  if (!defaultView.System) {
    if (!defaultView[FALLBACK_PROMISE_NAME]) {
      defaultView[FALLBACK_PROMISE_NAME] = importScript(
        FALLBACK_URL,
        defaultView
      );
    }
    await defaultView[FALLBACK_PROMISE_NAME];
  }

  // 复制 import maps 配置到沙盒
  if (
    sandboxed &&
    !defaultView.document.querySelector(SYSTEMJS_IMPORTMAP_SELECTOR)
  ) {
    const source = window.document.querySelector(SYSTEMJS_IMPORTMAP_SELECTOR);
    if (source) {
      const script = defaultView.document.createElement('script');
      script.type = TYPE;

      if (source.src) {
        script.src = source.src;
      } else {
        script.text = source.text;
      }

      defaultView.document.head.appendChild(script);
    }
  }

  return defaultView.System;
}

async function loader(view) {
  const { src, text, sandboxed } = view;
  const defaultView = sandboxed ? view.sandbox.window : window;
  const { Blob, URL } = defaultView;
  const System = await getSystem(defaultView);

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
