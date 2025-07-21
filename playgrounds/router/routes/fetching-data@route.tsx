import { defineRouteComponent, defineRouteHandler } from '@web-widget/react';
import { useLocation } from '@web-widget/helpers/navigation';
import type { HelloData } from './api/hello-world@route.ts';
import BaseLayout from './(components)/BaseLayout.tsx';
import ReactGithub from './(components)/Github@widget.tsx';
import VanillaGithub from './(components)/VanillaGithub@widget';
import VueGithub from '@playgrounds/web-router-vue3/Github@widget.vue?as=jsx';
import Vue2Github from '@playgrounds/web-router-vue2/Github@widget.vue?as=jsx';
import UserCard from './(components)/UserCard@widget.tsx';

async function fetchData(url: URL) {
  const data = await fetch(`${url.origin}/api/hello-world`);
  return (await data.json()) as HelloData;
}

export const handler = defineRouteHandler<HelloData>({
  async GET(ctx) {
    const data = await fetchData(useLocation());
    return ctx.html(data);
  },
});

export default defineRouteComponent<HelloData>(function Page({ data }) {
  return (
    <BaseLayout>
      <h1>Data Fetching Example</h1>

      <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
        <div>
          <h3>React Component</h3>
          <ReactGithub username="react" />
        </div>

        <div>
          <h3>Vue3 Component</h3>
          <VueGithub username="vuejs" />
        </div>

        <div>
          <h3>Vue2 Component</h3>
          <Vue2Github username="angular" />
        </div>

        <div>
          <h3>Vanilla JavaScript Component</h3>
          <VanillaGithub username="sveltejs" />
        </div>
      </div>

      <h2>Frontend Frameworks Showcase</h2>
      <p>
        Display mainstream frontend frameworks using beautiful card components:
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          marginTop: '20px',
        }}>
        <UserCard username="react" />
        <UserCard username="vuejs" />
        <UserCard username="angular" />
        <UserCard username="sveltejs" />
        <UserCard username="preactjs" />
        <UserCard username="solidjs" />
      </div>

      <h2>Data</h2>

      <div>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </BaseLayout>
  );
});
