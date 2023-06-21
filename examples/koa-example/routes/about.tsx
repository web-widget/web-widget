import { render, Handlers, ComponentProps } from "@web-widget/react";
import Counter from "../islands/Counter.tsx";

type AboutPageProps = {
  name: string;
};

export { render }

export const handler: Handlers<AboutPageProps> = {
  async GET(req, ctx) {
    const resp = await ctx.render({
      data: {
        name: 'Hello world'
      },
    });
    resp.headers.set("X-Custom-Header", "Hello");
    return resp;
  },
};

export default function AboutPage(props: ComponentProps<AboutPageProps>) {
  const { data: { name } } = props;
  return (
    <main>
      <h1>About</h1>
      <p>This is the about page</p>
      <p>{name}</p>
      <Counter widget name={name} start={3} />
    </main>
  );
}