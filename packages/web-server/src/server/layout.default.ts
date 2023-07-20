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

function renderDocumentMetaData(meta: Meta, base: string) {
  const priority: HTML[][] = [[], [], [], [], []];
  Array.from(Object.entries(meta)).forEach(([tagName, value]) => {
    const elements = Array.isArray(value) ? value : [value];

    if (tagName === "title") {
      return priority[0].push(html`<title>${value}</title>`);
    }

    if (tagName === "description" || tagName === "keywords") {
      return priority[1].push(
        html`<meta name="${tagName}" content="${value}" />`
      );
    }

    if (tagName === "meta") {
      return elements.forEach((props) =>
        priority[2].push(html`<meta ${attributes(props)} />`)
      );
    }

    if (tagName === "link") {
      return elements.forEach((props) =>
        priority[4].push(html`<link ${attributes(props)} />`)
      );
    }

    if (tagName === "style") {
      return elements.forEach(
        // prettier-ignore
        ({ style, ...props }) => priority[4].push(html`<style ${attributes(props)}>${style}</style>`)
      );
    }

    if (tagName === "script") {
      return elements.forEach(({ script, ...props }) =>
        // prettier-ignore
        priority[props?.type === "importmap" ? 3 : 4].push(html`<script ${attributes(props)}>${typeof script === "string" ? script : jsonContent(script)}</script>`)
      );
    }
  });

  return priority.flat();
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
    <html lang="${data.meta?.lang || "en"}">
      <head>
        <meta charset="utf-8" />
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
