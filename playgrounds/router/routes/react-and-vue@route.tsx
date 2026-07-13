import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget';
import VanillaCounter from './(components)/VanillaCounter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader, Section } from './(components)/ui';
import VueCounter from './(vue3)/Counter@widget.vue';
import Vue2Counter from '@playgrounds/web-router-vue2/Counter@widget.vue';
import { asReactWidget } from './(vue3)/helpers';
import { asReactWidget as vue2AsReactWidget } from './(vue2)/helpers';

const RVueCounter = asReactWidget(VueCounter);
const RVue2Counter = vue2AsReactWidget(Vue2Counter);

export const meta = defineMeta({
  title: 'Hello, Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React and Vue together"
        description="Mix React, Vue 3, Vue 2, and vanilla widgets on the same page. Each framework's component renders independently below."
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

      <Section title="Vanilla component">
        <VanillaCounter count={3} />
      </Section>
    </BaseLayout>
  );
});
