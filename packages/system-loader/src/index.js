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

export function setConfig(options) {
  Object.assign(CONFIG, options);
}

function defineHook(target, name, callback) {
  return Reflect.defineProperty(
    target,
    name,
    callback(Reflect.getOwnPropertyDescriptor(target, name))
  );
}

defineHook(
  HTMLWebWidgetElement.prototype,
  'createApplication',
  ({ value }) => ({
    value() {
      if (this.type !== 'system') {
        return value.apply(this, arguments);
      }

      const nameOrPath = this.import || this.src;

      return async () => {
        const System = await getSystem(window, CONFIG.remoteSystem);
        return System.import(nameOrPath).then(getModuleValue);
      };
    }
  })
);
