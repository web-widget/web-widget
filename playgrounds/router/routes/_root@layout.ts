import { html, render, unsafeHTML, unsafeStreamToHTML } from '@web-widget/html';

import type { HTML } from '@web-widget/html';
import type { LayoutComponentProps } from '@web-widget/web-router';
import { renderMetaToString } from '@web-widget/helpers';

export { render };

export default function RootLayout({
  meta,
  children,
}: LayoutComponentProps): HTML {
  /* eslint-disable prettier/prettier */
  return html`<!doctype html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
      </head>
      <body>
        ${children instanceof ReadableStream
          ? unsafeStreamToHTML(children)
          : unsafeHTML(children)}
      </body>
    </html>`;
}
