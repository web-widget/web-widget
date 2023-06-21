// @ts-nocheck
import { Suspense, Fragment, lazy } from 'react';

async function streamToString(stream: ReadableStream): Promise<string> {
  const chunks: Array<any> = [];
  for await (let chunk of stream) {
      chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8")
}

export function transform(jsx, type, props, ...args) {
  if (props && Reflect.has(props, 'widget')) {
    // TODO options 的 key 转换为小写
    const options = props.widget || {};
    const src = options.src;
    const id = type.name.toLowerCase();
    // The widget prop has been transformed to component path string by @web-widget/react/babel-plugin
    delete props.widget;
    return jsx(Suspense, {
      fallback: null,
      children: lazy(() => {
        return new Promise(async (resolve, reject) => {
          const module = await import(/* @vite-ignore */ src);

          if (typeof module.render !== 'function') {
            throw new Error(`The module does not export a 'render' method: ${src}`);
          }

          // const result = jsx(type, props, ...args);
          let html = '';
          const result = await module.render({
            component: module.default || type,
            ...props
          });
          
          if (result instanceof ReadableStream) {
            html = await streamToString(result);
          } else if (typeof result === 'string') {
            html = result;
          } else {
            throw new Error(`Render results in an unknown format: ${src}`);
          }

          resolve({
            default: jsx(Fragment, {
              children: [
                jsx("web-widget", {
                  key: 'container',
                  name: id,
                  context: JSON.stringify(props),
                  recovering: true,
                  loading: 'lazy',
                  rendertarget: 'light',
                  import: options.import,
                  base: options.base,
                  dangerouslySetInnerHTML: { __html: html },
                  //children: result,
                }),
                jsx("script", {
                  key: 'vite-placeholder',
                  type: "module",
                  dangerouslySetInnerHTML: {
                    __html: `import(/*@web-widget/react#vite-placeholder*/ ${JSON.stringify(options.base + options.import)})`
                  }
                })
             ]
            })
          })
        });
      })
    });
  }
  return jsx(type, props, ...args);
};
