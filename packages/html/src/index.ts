// User-facing entry. Adapter protocol (render, container, asHtmlWidget) is in ./adapter.
export { unsafeStreamToHTML, streamToHTML, renderToStream } from './render';
export { fallback, html, suspense, unsafeHTML } from './html';
export type { Fallback, HTML, Suspense, UnsafeHTML } from './html';
export { classMap, styleMap, ifDefined, when, join } from './directives';

/** @deprecated Import from '@web-widget/html/adapter' instead. */
export { asHtmlWidget } from './adapter';
