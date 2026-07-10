// User-facing entry. Adapter protocol (render, container) is in ./runtime.
export { asHtmlWidget, widget } from './widget';
export { container } from './runtime';
export type {
  HtmlWidgetComponent,
  HtmlWidgetProps,
  WidgetContainerConfig,
  DefineWebWidgetOptions,
} from './runtime';
export { unsafeStreamToHTML, streamToHTML, HTMLToStream } from './stream';
export { fallback, html, unsafeHTML } from './html';
export type { Fallback, HTML, UnsafeHTML } from './html';
