import type { Meta, RouteFallbackComponentProps } from "#schema";
import { isLikeHttpError } from "#schema";
import { html } from "./html";

export { render } from "./html";

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

export default function DefaultErrorPage(error: RouteFallbackComponentProps) {
  const message = isLikeHttpError(error)
    ? error.message
    : (error as Error).stack || error.message;

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
        minWidth: "300px",
        width: "50%",
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
      ${message
        ? // prettier-ignore
          html`<pre
            style="${style({
              margin: '0',
              fontSize: "12pt",
              overflowY: "auto",
              padding: '16px',
              paddingTop: '0',
              fontFamily: "monospace",
            })}">${message}</pre>`
        : ``}
    </div>
  </div>`;
}
