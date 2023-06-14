// @ts-nocheck
import * as jsxRuntime from 'react/jsx-dev-runtime';
export * from 'react/jsx-dev-runtime';
import { transform } from "./jsx-widget.js";

const originJsxDEV = jsxRuntime.jsxDEV;

export const jsxDEV = (...args) => transform(originJsxDEV, ...args);

export const Fragment = jsxRuntime.Fragment;