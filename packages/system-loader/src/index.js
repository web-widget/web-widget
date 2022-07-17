/* global HTMLWebWidgetElement, window */
const CONFIG = {
  remoteSystem: 'https://unpkg.com/systemjs@6.12.1/dist/s.min.js'
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
  let importmapSystemjs;

  // 载入远程的 SystemJS
  if (!defaultView.System) {
    const cacheKey = '@SystemPromise';
    if (!defaultView[cacheKey]) {
      defaultView[cacheKey] = importScript(
        importmapSystemjs || fallbackUrl,
        defaultView
      );
    }
    await defaultView[cacheKey];
    delete defaultView[cacheKey];
  }

  return defaultView.System;
}

async function loader(view) {
  const System = await getSystem(window, CONFIG.remoteSystem);
  const nameOrPath = view.import || view.src;

  return System.import(nameOrPath).then(getModuleValue);
}

export function setConfig(options) {
  Object.assign(CONFIG, options);
}

HTMLWebWidgetElement.loaders.define('system', loader);
