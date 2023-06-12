// @ts-nocheck
import * as jsxRuntime from 'react/jsx-runtime';
import { Suspense, lazy } from 'react'


const originJsx = jsxRuntime.jsx;
const originJsxs = jsxRuntime.jsxs;

const widget = (jsx, type, props, ...args) => {
  if (props && Reflect.has(props, 'widget')) {
    // TODO options 的 key 转换为小写
    const options = props.widget || {};
    const id = type.name.toLowerCase();
    // The widget prop has been transformed to component path string by babel-plugin-island
    delete props.widget;
    return jsx(Suspense, {
      fallback: null,
      children: lazy(() => {
        return new Promise((resolve, reject) => {
          // TODO result: 调用组件导出的 `render` 函数获取渲染结果，这样才能兼容到不同 UI 框架
          const result = jsx(type, props, ...args);

          resolve({
            default: jsx("web-widget", Object.assign({
              name: id,
              import: `#islands/${id}`,
              context: JSON.stringify(props),
              recovering: true,
              loading: 'lazy',
              rendertarget: 'light',
            }, options, {
              //dangerouslySetInnerHTML: { __html: html },
              children: result,
            }))
          })
        });
      })
    });
  }
  return jsx(type, props, ...args);
};

export const jsx = (...args) => widget(originJsx, ...args);

export const jsxs = (...args) => widget(originJsxs, ...args);

export const Fragment = jsxRuntime.Fragment;
