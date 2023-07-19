import {
  html,
  attributes,
  unsafeHTML,
  HTML,
  streamToHTML,
  jsonContent,
} from "./html";
import { Meta, RenderResult, ComponentProps } from "./types";

export { render } from "./html";

const RESOLVE_URL_REG = /^(?:\w+:)?\//;

function renderDocumentMetaData(meta: Meta, base: string) {
  return Array.from(Object.entries(meta))
    .map(([tagName, value]) => {
      const elements = Array.isArray(value) ? value : [value];

      if (tagName === "base") {
        return html`<base ${attributes(value)} />`;
      }

      if (tagName === "title") {
        return html`<title>${value}</title>`;
      }

      if (tagName === "meta") {
        return elements.map((props) => html`<meta ${attributes(props)} />`);
      }

      if (tagName === "link") {
        return elements.map((props) => {
          if (props.href && !RESOLVE_URL_REG.test(props.href)) {
            const rebaseHrefLink = {
              ...props,
              href: base + props.href,
            };
            return html`<link ${attributes(rebaseHrefLink)} />`;
          }
          return html`<link ${attributes(props)} />`;
        });
      }

      if (tagName === "style") {
        return elements.map(
          ({ style, ...props }) => html`<style ${attributes(props)}>
            ${style}
          </style>`
        );
      }

      if (tagName === "script") {
        return elements.map(
          ({ script, ...props }) => html`<script ${attributes(props)}>
            ${typeof script === "string" ? script : jsonContent(script)};
          </script>`
        );
      }
    })
    .flat();
}

export interface LayoutData {
  base: string;
  clientEntry: string;
  esModulePolyfillUrl?: string;
  meta: Meta;
  outlet: RenderResult;
}

export default function Layout(props: ComponentProps<LayoutData>): HTML {
  const data = props.data;
  return html`<!DOCTYPE html>
    <html lang="${data.meta?.lang || "en"}" renderer="@web-widget/web-server">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${renderDocumentMetaData(data.meta, data.base || "/")}
      </head>
      <body>
        ${typeof data.outlet === "string"
          ? data.outlet
          : streamToHTML(data.outlet as ReadableStream<string>)}
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
            })(${unsafeHTML(JSON.stringify(data.esModulePolyfillUrl))});
          }
        </script>
        ${data.clientEntry
          ? html`<script type="module">
              const loader = () =>
                import(${unsafeHTML(JSON.stringify(data.clientEntry))});
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
