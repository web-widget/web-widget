import { html, render, unsafeHTML, unsafeStreamToHTML } from "@web-widget/html";

import type { HTML } from "@web-widget/html";
import type { RootLayoutComponentProps } from "./types";
import { renderMetaToString } from "@web-widget/schema/server";

export { render };

// const declarativeShadowDomShim = html`<script id="shim:declarative-shadow-dom">
//   (function attachShadowRoots(root) {
//     root.querySelectorAll("template[shadowroot]").forEach((template) => {
//       const mode = template.getAttribute("shadowroot");
//       const host = template.parentNode;
//       const shadowRoot = template.parentNode.attachShadow({
//         mode,
//       });
//       const attachInternals = host.attachInternals;
//       const attachShadow = host.attachShadow;

//       Object.assign(host, {
//         attachShadow() {
//           shadowRoot.innerHTML = "";
//           return shadowRoot;
//         },
//         attachInternals() {
//           const ei = attachInternals
//             ? attachInternals.call(this, arguments)
//             : {};
//           return Object.create(ei, {
//             shadowRoot: { value: shadowRoot },
//           });
//         },
//       });

//       shadowRoot.appendChild(template.content);
//       template.remove();
//       attachShadowRoots(shadowRoot);
//     });
//   })(document);
// </script>`;

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
      importShim.$proxy = true;
      return promise.then((importShim) => importShim(...arguments));
    }
  }
</script>`;

export default function DefaultRootLayout({
  meta,
  children,
  bootstrap,
}: RootLayoutComponentProps): HTML {
  // eslint-disable-next-line prettier/prettier
  return html`<!DOCTYPE html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
      </head>
      <body>
        ${typeof children === "string"
          ? children
          : unsafeStreamToHTML(children as ReadableStream)}
        ${importShimLoader}
        ${unsafeHTML(
          renderMetaToString({
            script: bootstrap,
          })
        )}
      </body>
    </html>`;
}
