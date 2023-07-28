import type { Handlers } from "@web-widget/react";
export { render } from "@web-widget/react";

export const handler: Handlers = {
  async GET(ctx) {
    const resp = await ctx.render();
    resp.headers.set("X-Custom-Header", "Hello");
    return resp;
  },
};

export default function Page() {
  return (
    <main>
      <h1>Custom handlers</h1>
      <p>
        Please open the web inspection pane of your browser's developer tools.
      </p>
    </main>
  );
}