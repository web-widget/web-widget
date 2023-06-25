// @ts-nocheck
import * as jsxRuntime from "react/jsx-runtime";
import { transform } from "./jsx-transform";

const originJsx = jsxRuntime.jsx;
const originJsxs = jsxRuntime.jsxs;

export const jsx = (...args) => transform(originJsx, false, ...args);

export const jsxs = (...args) => transform(originJsxs, false, ...args);

export const Fragment = jsxRuntime.Fragment;
