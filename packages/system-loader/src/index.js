/* global HTMLWebWidgetElement, window */
const CONFIG = {
  remoteSystem: 'https://cdn.jsdelivr.net/npm/systemjs@6/dist/s.min.js'
};

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

async function getSystem(defaultView, fallbackUrl) {
  const sandboxed = window !== defaultView;
  const type = 'systemjs-importmap';
  const importmapSelector = `script[type=${type}]`;

  // 载入远程的 SystemJS
  if (!defaultView.System) {
    const cacheKey = '@SystemPromise';
    if (!defaultView[cacheKey]) {
      defaultView[cacheKey] = importScript(fallbackUrl, defaultView);
    }
    await defaultView[cacheKey];
    delete defaultView[cacheKey];
  }

  // 复制 import maps 配置到沙盒
  if (sandboxed && !defaultView.document.querySelector(importmapSelector)) {
    const source = window.document.querySelector(importmapSelector);
    if (source) {
      const script = defaultView.document.createElement('script');
      script.type = type;

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
  const System = await getSystem(defaultView, CONFIG.remoteSystem);

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

export function setConfig(options) {
  Object.assign(CONFIG, options);
}

HTMLWebWidgetElement.loaders.define('system', loader);
