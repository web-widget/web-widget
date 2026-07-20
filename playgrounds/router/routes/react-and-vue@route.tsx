import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';
import ReactCounter from '~/routes/(components)/react/Counter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader, Section } from './(components)/ui';

const RVueCounter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue')
);
const RVue2Counter = widget(
  () => import('~/routes/(vue2)/(components)/Vue2Counter@widget.vue')
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
