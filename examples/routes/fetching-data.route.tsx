import type { Handlers, RouteComponentProps } from "@web-widget/react";
import type { HelloData } from "./api/hello-world.route.ts";
import BaseLayout from "./_components/BaseLayout.tsx";
import VueGithub from "@examples/vue3/Github.widget.vue?as=jsx";
import Vue2Github from "@examples/vue2/Github.widget.vue?as=jsx";
import ReactGithub from "./_components/Github.widget.tsx";
import VanillaGithub from "./_components/Github.widget.ts";

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export const handler: Handlers<HelloData> = {
  async GET(ctx) {
    const data = await fetchData(new URL(ctx.request.url));
    return ctx.render({
      data,
    });
  },
};

export default function Page({ data }: RouteComponentProps<HelloData>) {
  return (
    <BaseLayout>
      <h1>Fetching data</h1>
      <ul>
        {data.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.url}>{item.title}</a>
            </li>
          );
        })}
      </ul>
      <hr />
      <VueGithub username="aui" />
      <Vue2Github username="guybedford" />
      <ReactGithub username="aui" />
      <VanillaGithub username="aui" />
    </BaseLayout>
  );
}
