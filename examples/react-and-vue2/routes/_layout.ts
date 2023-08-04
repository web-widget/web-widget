import { html, render, unsafeHTML, unsafeStreamToHTML } from "@web-widget/html";

import type { HTML } from "@web-widget/html";
import type { RootLayoutComponentProps } from "@web-widget/web-router";
import { renderMetaToString } from "@web-widget/schema/server";

export { render };

const importShimLoader = html`<script id="shim:es-module">
  if (!HTMLScriptElement.supports || !HTMLScriptElement.supports("importmap")) {
    function importShim() {
      const esModuleShimUrl =
        "https://ga.jspm.io/npm:es-module-shims@1.7.3/dist/es-module-shims.js";
      const promise = new Promise((resolve, reject) => {
        document.head.appendChild(
          Object.assign(document.createElement("script"), {
            src: esModuleShimUrl,
            crossorigin: "anonymous",
            async: true,
            onload() {
              if (!importShim.$proxy) {
                resolve(importShim);
              } else {
                reject(
                  new Error("No globalThis.importShim found:" + esModuleShimUrl)
                );
              }
            },
            onerror(error) {
              reject(error);
            },
          })
        );
      });
      return promise.then((importShim) => importShim(...arguments));
    }
    importShim.$proxy = true;
  }
</script>`;

export default function RootLayout({
  meta,
  children,
  bootstrap,
}: RootLayoutComponentProps): HTML {
  // eslint-disable-next-line prettier/prettier
  return html`<!doctype html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
        ${importShimLoader}
      </head>
      <body>
        ${children instanceof ReadableStream ? unsafeStreamToHTML(children) : children}
        ${unsafeHTML(renderMetaToString({ script: bootstrap })
        )}
      </body>
    </html>`;
}
