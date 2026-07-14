import { defineRouteComponent, defineRouteHandler } from '@web-widget/helpers';
import { useLocation } from '@web-widget/helpers/navigation';
import type { HelloData } from '../api/hello-world@route.ts';
import { container } from '@web-widget/react/adapter';
import BaseLayout from '../(components)/BaseLayout.tsx';
import {
  PageHeader,
  Section,
  CardGrid,
  Card,
  CodeBlock,
} from '../(components)/ui';
import ReactGithub from './Github@widget.tsx';
import VanillaGithub from './VanillaGithub@widget';
import UserCard from './UserCard@widget.tsx';

const RVueGithub = container(
  () => import('@playgrounds/web-router-vue3/Github@widget.vue')
);
const RVue2Github = container(
  () => import('@playgrounds/web-router-vue2/Github@widget.vue')
);

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
      <PageHeader
        title="Fetching data"
        description="Fetch data on the server and render it into HTML before sending the response."
      />

      <Section title="Framework showcase">
        <CardGrid>
          <Card title="React Component">
            <ReactGithub username="react" />
          </Card>
          <Card title="Vue3 Component">
            <RVueGithub username="vuejs" />
          </Card>
          <Card title="Vue2 Component">
            <RVue2Github username="angular" />
          </Card>
          <Card title="Vanilla JavaScript Component">
            <VanillaGithub username="sveltejs" />
          </Card>
        </CardGrid>
      </Section>

      <Section
        title="Frontend frameworks showcase"
        description="Display mainstream frontend frameworks using beautiful card components:">
        <CardGrid>
          <UserCard username="react" />
          <UserCard username="vuejs" />
          <UserCard username="angular" />
          <UserCard username="sveltejs" />
          <UserCard username="preactjs" />
          <UserCard username="solidjs" />
        </CardGrid>
      </Section>

      <Section title="Data">
        <CodeBlock>{JSON.stringify(data, null, 2)}</CodeBlock>
      </Section>
    </BaseLayout>
  );
});
