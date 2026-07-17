import { renderMetaToString } from '@web-widget/helpers';
import {
  html,
  unsafeHTML,
  unsafeStreamToHTML,
  type HTML,
} from '@web-widget/html';
import { render } from '@web-widget/html/adapter';
import type { LayoutComponentProps } from '@web-widget/web-router';

export { render };

export default function RootLayout({
  meta,
  children,
}: LayoutComponentProps): HTML {
  return html`<!doctype html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
      </head>
      <body>
        ${
          children instanceof ReadableStream
            ? unsafeStreamToHTML(children)
            : unsafeHTML(children)
        }
      </body>
    </html>`;
}
