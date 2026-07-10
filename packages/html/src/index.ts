// User-facing entry. Runtime code (render, container) is in ./runtime.
export { asHtmlWidget } from './as-html-widget';
export { widget, container } from './runtime.server';
export type {
  HtmlWidgetComponent,
  HtmlWidgetProps,
  WidgetContainerConfig,
  DefineWebWidgetOptions,
} from './runtime.server';
export {
  fallback,
  html,
  unsafeHTML,
  unsafeStreamToHTML,
  streamToHTML,
  HTMLToStream,
} from './server';
export type { Fallback, HTML, UnsafeHTML } from './html';
