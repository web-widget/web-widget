import { defineRouteComponent } from '@web-widget/helpers';
import type { HelloData } from './api/hello-world@route.ts';
import BaseLayout from './(components)/BaseLayout.tsx';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export default defineRouteComponent(async function Page({ request }) {
  const data = await fetchData(new URL(request.url));
  return (
    <BaseLayout>
      <h1>Async component</h1>
      <p>
        Server components can be async - they await data before rendering,
        streaming the result to the client.
      </p>
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
