import type { MiddlewareHandlerContext } from "@web-widget/web-router";

interface State {
  data: string;
}

export async function handler(
  ctx: MiddlewareHandlerContext<State>,
  next: () => Promise<Response>
) {
  const resp = await next();
  resp.headers.set("X-Powered-By", "@web-widget/web-router");
  return resp;
}
