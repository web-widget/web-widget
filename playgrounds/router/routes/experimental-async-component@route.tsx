import { defineRouteComponent } from '@web-widget/helpers';
import type { HelloData } from './api/hello-world@route.ts';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader } from './(components)/ui';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export default defineRouteComponent(async function Page({ request }) {
  const data = await fetchData(new URL(request.url));
  return (
    <BaseLayout>
      <PageHeader
        title="Async component"
        description="Server components can be async - they await data before rendering, streaming the result to the client."
      />
      <ul>
        {data.map((item, index) => {
          return (
            <li key={index}>
              <a href={item.url}>{item.title}</a>
            </li>
          );
        })}
      </ul>
    </BaseLayout>
  );
});
