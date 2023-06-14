// @ts-nocheck
import * as jsxRuntime from 'react/jsx-runtime';
import { transform } from "./jsx-widget.js";

const originJsx = jsxRuntime.jsx;
const originJsxs = jsxRuntime.jsxs;

export const jsx = (...args) => transform(originJsx, ...args);

export const jsxs = (...args) => transform(originJsxs, ...args);

export const Fragment = jsxRuntime.Fragment;
