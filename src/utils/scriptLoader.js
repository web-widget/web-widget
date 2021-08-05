/* global URL, Blob, fetch */
export const appendSourceUrl = (source, url) => {
  const sourceURLRegEx =
    /(\/\/# sourceURL=)((https?:\/\/)?([\w-])+\.{1}([a-zA-Z]{2,63})([/\w-]*)*\/?\??([^#\n\r]*)?)/;

  if (!sourceURLRegEx.test(source)) {
    source += `\n//# sourceURL=${url}`;
  } else {
    // 将相对路径的 sourceURL 转化为绝对路径
    source = source.replace(
      sourceURLRegEx,
      (match, left, sourceURL) => `${left}${URL(sourceURL, url).href}`
    );
  }

  return source;
};

export const evaluate = (source, sandbox, context) => {
  if (sandbox) {
    return sandbox.evaluate(source.toString(), context);
  }

  if (!context && typeof source !== 'string') {
    return source;
  }

  context = context || {};
  const keys = Object.keys(context);
  const values = Object.values(context);
  const code = `'use strict';return eval(${JSON.stringify(source)})`;

  // eslint-disable-next-line no-new-func
  return new Function(...keys, code)(...values);
};

export function umdParser(source, sandbox) {
  const { define, module, exports } = evaluate(() => {
    const exports = {};
    const module = { exports };
    const define = factory => {
      module.exports = typeof factory === 'function' ? factory() : factory;
    };

    return {
      module,
      exports,
      define
    };
  }, sandbox)();

  define.amd = true;

  evaluate(source, sandbox, {
    define,
    module,
    exports
  });

  return module.exports;
}

export function moduleParser(source, sandbox) {
  if (sandbox) {
    return Promise.reject(
      new Error(`The module format does not support sandbox mode`)
    );
  }

  const blob = new Blob([source], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  return import(url).then(
    module => {
      URL.revokeObjectURL(url);
      return module.default || module;
    },
    error => {
      URL.revokeObjectURL(url);
      throw error;
    }
  );
}

export const scriptSourceLoader = (url, options = {}) => {
  return fetch(url, {
    credentials: 'same-origin',
    ...options
  }).then(res => {
    if (!res.ok) {
      throw Error([res.status, res.statusText, url].join(', '));
    }
    const jsContentTypeRegEx = /^(text|application)\/(x-)?javascript(;|$)/;
    const contentType = res.headers.get('content-type');

    if (!contentType || !jsContentTypeRegEx.test(contentType)) {
      throw Error(contentType);
    }

    return res.text();
  });
};
