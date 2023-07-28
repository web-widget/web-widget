import type { MiddlewareHandler } from "@web-widget/web-server";

export const handler: MiddlewareHandler[] = [
  async function middleware1(ctx) {
    // do something
    return ctx.next();
  },
  async function middleware2(ctx) {
    // do something
    return ctx.next();
  },
];
