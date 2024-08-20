import { html, render, unsafeHTML, unsafeStreamToHTML } from '@web-widget/html';

import type { HTML } from '@web-widget/html';
import { renderMetaToString } from '@web-widget/helpers';
import type { LayoutComponentProps } from './types';

export { render };

export default function DefaultRootLayout({
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
        ${typeof children === 'string'
          ? unsafeHTML(children)
          : unsafeStreamToHTML(children)}
      </body>
    </html>`;
}
