/* global window, HTMLWebWidgetElement */
import { getGlobalExport, noteGlobalProps } from './globalExport.js';

const CONFIG = {
  useFirstGlobalProperty: false
};

function getGlobalVariable(name, defaultView) {
  if (name) {
    return defaultView[name];
  }

  return getGlobalExport(defaultView, CONFIG.useFirstGlobalProperty);
}

async function importScript(url, defaultView, name) {
  const cacheKey = '@WebWidgetUmdSrcCache';
  const cache = (defaultView[cacheKey] = defaultView[cacheKey] || new Map());

  if (!name) {
    noteGlobalProps(defaultView);
  }

  if (cache.has(url)) {
    return cache.get(url);
  }

  const promise = new Promise((resolve, reject) => {
    const script = defaultView.document.createElement('script');

    script.onload = () => {
      script.parentNode.removeChild(script);
      resolve(getGlobalVariable(name, defaultView));
    };

    script.onerror = error => {
      cache.delete(url);
      reject(error);
    };

    script.src = url;

    defaultView.document.head.appendChild(script);
  });

  cache.set(url, promise);
  return promise;
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
      if (this.type !== 'umd') {
        return value.apply(this, arguments);
      }

      const libraryName =
        this.library ||
        this.getAttribute('library') ||
        this.getAttribute('name');

      if (this.import) {
        throw Error(
          `WebWidgetUmdLoader: Unsupported features: import="${this.import}"`
        );
      }

      return async () => importScript(this.src, window, libraryName);
    }
  })
);
