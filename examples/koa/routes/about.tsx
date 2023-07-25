import {
  render,
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
} from "@web-widget/react";

import Counter from "../widgets/Counter.tsx";

type AboutPageProps = {
  name: string;
};

export { render };

export const meta = defineMeta({
  title: "Hello, Web widget.",
});

export const handler = defineRouteHandler<AboutPageProps>({
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

export default defineRouteComponent<AboutPageProps>(function AboutPage(props) {
  const {
    data: { name },
  } = props;
  return (
    <>
      <h1>About</h1>
      <p>This is the about page</p>
      <p>{name}</p>
      <Counter client name={name} start={3} />
    </>
  );
});
