import { html, HTML, streamToHTML, unsafeHTML } from "./html";
import { RenderResult, ComponentProps, Meta } from "./types";
import { renderMetaToString } from "./helpers";

export { render } from "./html";

export interface LayoutData {
  clientEntry: string;
  esModulePolyfillUrl?: string;
  meta: Meta;
  outlet: RenderResult;
}

export default function Layout({
  data: { clientEntry, esModulePolyfillUrl, meta, outlet },
}: ComponentProps<LayoutData>): HTML {
  return html`<!DOCTYPE html>
    <html lang="${meta.lang}">
      <head>
        ${unsafeHTML(renderMetaToString(meta))}
      </head>
      <body>
        ${typeof outlet === "string"
          ? outlet
          : streamToHTML(outlet as ReadableStream<string>)}
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
            window.importShim = (function (src) {
              const promise = new Promise((resolve, reject) => {
                document.head.appendChild(
                  Object.assign(document.createElement("script"), {
                    src,
                    crossorigin: "anonymous",
                    async: true,
                    onload() {
                      if (importShim !== importShimProxy) {
                        resolve(importShim);
                      } else {
                        reject(new Error("No self.importShim found:" + src));
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
            })(${unsafeHTML(JSON.stringify(esModulePolyfillUrl))});
          }
        </script>
        ${clientEntry
          ? html`<script type="module">
              const loader = () =>
                import(${unsafeHTML(JSON.stringify(clientEntry))});
              typeof importShim === "function"
                ? importShim(
                    loader.toString().match(/\\bimport\\("([^"]*?)"\\)/)[1]
                  )
                : loader();
            </script>`
          : ``}
      </body>
    </html>`;
}
