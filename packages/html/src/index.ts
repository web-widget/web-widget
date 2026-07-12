// User-facing entry. Adapter protocol (render, container) is in ./adapter.
export { asHtmlWidget, container } from './components';
export type {
  HtmlWidgetComponent,
  HtmlWidgetProps,
  WidgetContainerConfig,
  DefineWebWidgetOptions,
} from './components';
export { unsafeStreamToHTML, streamToHTML, renderToStream } from './render';
export { fallback, html, suspense, unsafeHTML } from './html';
export type { Fallback, HTML, Suspense, UnsafeHTML } from './html';
export { classMap, styleMap, ifDefined, when, join } from './directives';
