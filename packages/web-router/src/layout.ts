/**
 * @fileoverview Default layout module for web-router
 */
import { html, unsafeHTML, unsafeStreamToHTML } from '@web-widget/html';
import { render } from '@web-widget/html/adapter';

import type { HTML } from '@web-widget/html';
import { renderMetaToString } from '@web-widget/helpers';
import type { LayoutComponentProps } from './types';

export { render };

export default function DefaultRootLayout({
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
          typeof children === 'string'
            ? unsafeHTML(children)
            : unsafeStreamToHTML(children)
        }
      </body>
    </html>`;
}
