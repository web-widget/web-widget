import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import type { HelloData } from './api/hello-world@route.ts';
import BaseLayout from './(components)/BaseLayout.tsx';
import ReactGithub from './(components)/Github@widget.tsx';
import VanillaGithub from './(components)/VanillaGithub@widget';
import VueGithub from '@examples/web-router-vue3/Github@widget.vue?as=jsx';
import Vue2Github from '@examples/web-router-vue2/Github@widget.vue?as=jsx';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export const handler = defineRouteHandler<HelloData>({
  async GET(ctx) {
    const data = await fetchData(new URL(ctx.request.url));
    return ctx.render({
      data,
    });
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
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
});
