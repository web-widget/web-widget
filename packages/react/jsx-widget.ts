// @ts-nocheck
import { Suspense, Fragment, lazy } from 'react';
export function transform(jsx, type, props, ...args) {
  if (props && Reflect.has(props, 'widget')) {
    // TODO options 的 key 转换为小写
    const options = props.widget || {};
    const id = type.name.toLowerCase();
    // The widget prop has been transformed to component path string by @web-widget/react/babel-plugin
    delete props.widget;
    return jsx(Suspense, {
      fallback: null,
      children: lazy(() => {
        return new Promise((resolve, reject) => {
          // TODO result: 调用组件导出的 `render` 函数获取渲染结果，这样才能兼容到不同 UI 框架
          const result = jsx(type, props, ...args);

          resolve({
            default: jsx(Fragment, {
              children: [
                jsx("web-widget", Object.assign({
                  key: 'container',
                  name: id,
                  import: `#islands/${id}`,
                  context: JSON.stringify(props),
                  recovering: true,
                  loading: 'lazy',
                  rendertarget: 'light',
                }, options, {
                  //dangerouslySetInnerHTML: { __html: html },
                  children: result
                })),
                jsx("script", {
                  key: 'vite:prefetch',
                  type: "module",
                  dangerouslySetInnerHTML: {
                    __html: `import /*@web-widget/react:vite-prefetch*/${JSON.stringify(options.base + options.import)}`
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
