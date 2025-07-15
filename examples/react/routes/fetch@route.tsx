import {
  defineMeta,
  defineRouteComponent,
  defineRouteHandler,
} from '@web-widget/helpers';
import type { HelloData } from './api/hello@route.ts';
import BaseLayout from './(components)/BaseLayout.tsx';

export const meta = defineMeta({
  title: 'Fetching data - Web Widget',
});

export const handler = defineRouteHandler<HelloData>({
  async GET({ request, render }) {
    const url = new URL(request.url);
    const api = `${url.origin}/api/hello`;
    const res = await fetch(api);

    if (!res.ok) {
      throw new Error(`Failed to fetch data from ${api}`);
    }

    const data = (await res.json()) as HelloData;
    return render({ data });
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
  return (
    <BaseLayout>
      <h1>Fetching data</h1>
      <ul>
        {data.map((item, index) => {
          return <li key={index}>{item.title}</li>;
        })}
      </ul>
      <p>
        Source:
        <a href="/api/hello" target="_blank">
          /api/hello
        </a>
      </p>
    </BaseLayout>
  );
});
