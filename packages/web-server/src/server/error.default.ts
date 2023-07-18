import { DEBUG } from "./constants";
import type { ErrorComponentProps, Meta } from "./types";
import { html } from "./html";

export { render } from "./html";

export const meta: Meta[] = [
  {
    title: "Error",
  },
];

function style(style: Record<string, string | number>) {
  return Object.entries(style)
    .map(
      ([k, v]) =>
        `${k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}:${v}`
    )
    .join(";");
}

export default function DefaultErrorPage(props: ErrorComponentProps) {
  const { error } = props;

  let message = undefined;
  if (DEBUG) {
    if (error instanceof Error) {
      message = error.stack;
    } else {
      message = String(error);
    }
  }

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
        margin: 16,
        minWidth: "300px",
        width: "50%",
      })}">
      <p
        style="${style({
          margin: 0,
          fontSize: "12pt",
          padding: 16,
          fontFamily: "sans-serif",
        })}">
        An error occurred during route handling or page rendering.
      </p>
      ${message
        ? html`<pre
            style="${style({
              margin: 0,
              fontSize: "12pt",
              overflowY: "auto",
              padding: 16,
              paddingTop: 0,
              fontFamily: "monospace",
            })}">
${message}</pre
          >`
        : ``}
    </div>
  </div>`;
}
