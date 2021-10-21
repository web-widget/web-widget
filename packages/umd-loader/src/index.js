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

async function execScript(text, defaultView, name) {
  if (!name) {
    noteGlobalProps(defaultView);
  }

  defaultView.eval(text);

  return getGlobalVariable(name, defaultView);
}

async function umdLoader(view) {
  const { src, text, sandboxed, name } = view;
  const defaultView = sandboxed ? view.sandbox.window : window;

  if (src) {
    return importScript(src, defaultView, name);
  }
  return execScript(text, defaultView, name);
}

export function setConfig(options) {
  Object.assign(CONFIG, options);
}

HTMLWebWidgetElement.loaders.define('umd', umdLoader);
