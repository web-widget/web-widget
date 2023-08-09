export type { HTML, Fallback } from "@worker-tools/html";
export * from "@web-widget/schema/server-helpers";

const notImplemented = (name: string) => () => {
  throw new Error(`Client is not implemented: ${name}()`);
};

export const unsafeHTML = notImplemented("unsafeHTML");
export const fallback = notImplemented("fallback");
export const html = notImplemented("html");
export const unsafeStreamToHTML = notImplemented("unsafeStreamToHTML");
export const streamToHTML = notImplemented("streamToHTML");
export const render = notImplemented("render");
