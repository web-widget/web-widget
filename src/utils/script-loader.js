/* global URL, fetch */
export const appendSourceUrl = (source, url) => {
  const sourceURLRegEx = /(\/\/# sourceURL=)((https?:\/\/)?([\w-])+\.{1}([a-zA-Z]{2,63})([/\w-]*)*\/?\??([^#\n\r]*)?)/;

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

export function UMDParser(source, sandbox, context = {}) {
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
    exports,
    ...context
  });

  return module.exports;
}

export const scriptSourceLoader = (url, options = {}) => {
  return fetch(url, {
    credentials: 'same-origin',
    cache: 'force-cache',
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

export const absoluteUrl = (url, baseURI) => new URL(url, baseURI).href;

export const scriptLoader = (url, baseURI, sandbox, context) => {
  url = absoluteUrl(url, baseURI);
  return scriptSourceLoader(url).then(source =>
    UMDParser(appendSourceUrl(source, url), sandbox, context)
  );
};
