import {
  render,
  defineClient,
  Handlers,
  ComponentProps,
} from "@web-widget/react";

const Counter = defineClient(
  () => import("../islands/Counter.tsx"),
  import.meta.url
);

type AboutPageProps = {
  name: string;
};

export { render };

export const handler: Handlers<AboutPageProps> = {
  async GET(req, ctx) {
    const resp = await ctx.render({
      data: {
        name: "Hello world",
      },
    });
    resp.headers.set("X-Custom-Header", "Hello");
    return resp;
  },
};

export default function AboutPage(props: ComponentProps<AboutPageProps>) {
  const {
    data: { name },
  } = props;
  return (
    <main>
      <h1>About</h1>
      <p>This is the about page</p>
      <p>{name}</p>
      <Counter name={name} start={3} />
    </main>
  );
}
