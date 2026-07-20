import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import { params } from '@web-widget/helpers/navigation';
import type { HelloData } from '../api/hello-world@route.ts';
import BaseLayout from '../(components)/BaseLayout.tsx';
import { PageHeader } from '../(components)/ui';
import Counter from '~/routes/(components)/react/Counter@widget.tsx';

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
      <PageHeader title="Context" />
      <ul>
        {data.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.url}>{item.title}</a>
            </li>
          );
        })}
      </ul>
      <Counter count={3} />
    </BaseLayout>
  );
});
