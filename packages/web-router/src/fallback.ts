import type {
  Meta,
  RouteFallbackComponentProps,
} from "@web-widget/schema/server";
import { html, render } from "@web-widget/html";

export { render };

export const meta: Meta = {
  title: "Error",
};

function style(style: Record<string, string | number>) {
  return Object.entries(style)
    .map(
      ([k, v]) =>
        `${k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${v}`
    )
    .join(";");
}

const Code = (code: string = "") =>
  code
    ? // prettier-ignore
      html`<pre
          style="${style({
            margin: "0",
            fontSize: "12pt",
            overflowY: "auto",
            padding: "16px",
            paddingTop: "0",
            fontFamily: "monospace",
          })}">${code}</pre>`
    : "";

export const fallback = function DefaultRootErrorPage(
  error: RouteFallbackComponentProps
) {
  return html`<div
    style="${style({
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    })}">
    <div
      style="${style({
        border: "#f3f4f6 2px solid",
        borderTop: "red 4px solid",
        background: "#f9fafb",
        margin: "16px",
        minWidth: "550px",
      })}">
      <p
        style="${style({
          margin: "0",
          fontSize: "12pt",
          padding: "16px",
          fontFamily: "sans-serif",
        })}">
        An error occurred during route handling or page rendering.
      </p>
      ${Code(error.stack || error.message)}
    </div>
  </div>`;
};
