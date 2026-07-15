import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import ReactCounter from './frameworks/react/Counter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader, Section } from './(components)/ui';

const RVueCounter = container(
  () => import('./(vue3)/frameworks/vue3/Counter@widget.vue')
);
const RVue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);

export const meta = defineMeta({
  title: 'Hello, Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React and Vue together"
        description="Mix React, Vue 3, and Vue 2 widgets on the same page. Each framework's component renders independently below."
      />

      <Section title="React component">
        <ReactCounter count={3} />
      </Section>

      <Section title="Vue3 component">
        <RVueCounter count={3} />
      </Section>

      <Section title="Vue2 component">
        <RVue2Counter count={3} />
      </Section>
    </BaseLayout>
  );
});
