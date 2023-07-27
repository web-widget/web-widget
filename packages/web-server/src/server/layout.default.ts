import { render, html, HTML, streamToHTML, unsafeHTML } from "@web-widget/html";
import type { LayoutComponentProps } from "./types";
import { renderMetaToString } from "#schema";

export { render };

export default function RootLayout({
  meta,
  children,
  bootstrap,
}: LayoutComponentProps): HTML {
  return html`<!DOCTYPE html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
      </head>
      <body>
        ${typeof children === "string"
          ? children
          : streamToHTML(children as ReadableStream<string>)}
        <script>
          /* Polyfill: Declarative Shadow DOM */
          (function attachShadowRoots(root) {
            root
              .querySelectorAll("template[shadowroot]")
              .forEach((template) => {
                const mode = template.getAttribute("shadowroot");
                const host = template.parentNode;
                const shadowRoot = template.parentNode.attachShadow({ mode });
                const attachInternals = host.attachInternals;
                const attachShadow = host.attachShadow;

                Object.assign(host, {
                  attachShadow() {
                    shadowRoot.innerHTML = "";
                    return shadowRoot;
                  },
                  attachInternals() {
                    const ei = attachInternals
                      ? attachInternals.call(this, arguments)
                      : {};
                    return Object.create(ei, {
                      shadowRoot: { value: shadowRoot },
                    });
                  },
                });

                shadowRoot.appendChild(template.content);
                template.remove();
                attachShadowRoots(shadowRoot);
              });
          })(document);
        </script>
        <script>
          /* Polyfill: ES Module */
          if (
            !HTMLScriptElement.supports ||
            !HTMLScriptElement.supports("importmap")
          ) {
            window.importShim = (function () {
              const esModuleShims =
                "https://ga.jspm.io/npm:es-module-shims@1.7.3/dist/es-module-shims.js";
              const promise = new Promise((resolve, reject) => {
                document.head.appendChild(
                  Object.assign(document.createElement("script"), {
                    esModuleShims,
                    crossorigin: "anonymous",
                    async: true,
                    onload() {
                      if (importShim !== importShimProxy) {
                        resolve(importShim);
                      } else {
                        reject(
                          new Error("No self.importShim found:" + esModuleShims)
                        );
                      }
                    },
                    onerror(error) {
                      reject(error);
                    },
                  })
                );
              });
              return function importShimProxy() {
                return promise.then((importShim) => importShim(...arguments));
              };
            })();
          }
        </script>
        ${unsafeHTML(
          renderMetaToString({
            script: bootstrap,
          })
        )}
      </body>
    </html>`;
}
