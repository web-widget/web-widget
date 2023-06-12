export const handler = [
  async function middleware1(req, ctx) {
    // do something
    return ctx.next();
  },
  async function middleware2(req, ctx) {
    // do something
    return ctx.next();
  },
];