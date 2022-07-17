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

async function umdLoader(view) {
  const { src } = view;
  const libraryName =
    view.library || view.getAttribute('library') || view.getAttribute('name');

  if (view.import) {
    throw Error(
      `WebWidgetUmdLoader: Unsupported features: import="${view.import}"`
    );
  }

  return importScript(src, window, libraryName);
}

export function setConfig(options) {
  Object.assign(CONFIG, options);
}

HTMLWebWidgetElement.loaders.define('umd', umdLoader);
