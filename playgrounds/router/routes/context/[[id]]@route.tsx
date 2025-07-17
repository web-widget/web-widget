import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import { params } from '@web-widget/helpers/navigation';
import type { HelloData } from '../api/hello-world@route.ts';
import BaseLayout from '../(components)/BaseLayout.tsx';
import Counter from '../(components)/Counter@widget.tsx';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export const handler = defineRouteHandler<HelloData>({
  async GET(ctx) {
    const data = await fetchData(new URL(ctx.request.url));
    return ctx.html(data);
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
  console.log('params', params());
  return (
    <BaseLayout>
      <h1>Context</h1>
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
      <Counter count={3} />
    </BaseLayout>
  );
});
