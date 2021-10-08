/* global System, HTMLWebWidgetElement */
let index = 0;

export default async function loader({ src, text, name = 'anonymous' }) {
  if (src) {
    return System.import(src);
  }

  let id = `${name}${index++}`;

  // eslint-disable-next-line no-new-func
  return new Function(
    'System',
    'loader',
    `'use strict';
      ${JSON.stringify(text)};
      return loader(});`
  )(
    {
      register(...args) {
        if (typeof args[0] === 'string') {
          id = args[0];
        } else {
          args.unshift(id);
        }
        System.register(...args);
      }
    },
    () => System.import(id)
  );
}

HTMLWebWidgetElement.loaders.define('system', loader);
