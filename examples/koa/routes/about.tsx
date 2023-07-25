import {
  render,
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
} from "@web-widget/react";

import Counter from "../widgets/Counter.tsx";

type AboutPageData = {
  name: string;
};

export { render };

export const meta = defineMeta({
  title: "Hello, Web widget.",
});

export const handler = defineRouteHandler<AboutPageData>({
  async GET(req, ctx) {
    console.log(ctx.meta);

    const resp = await ctx.render({
      data: {
        name: "Hello world",
      },
    });
    resp.headers.set("X-Custom-Header", "Hello");
    return resp;
  },
});

export default defineRouteComponent<AboutPageData>(function AboutPage({
  data: { name },
}) {
  return (
    <>
      <h1>About</h1>
      <p>This is the about page</p>
      <p>{name}</p>
      <Counter client name={name} start={3} />
    </>
  );
});
