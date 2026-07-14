import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import Counter from './Counter@widget';
import BaseLayout from '../../(components)/BaseLayout';
import { PageHeader, Section } from '../../(components)/ui';

const Vue3Counter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue')
);
const Vue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue')
);
const SvelteCounter = container(
  () => import('../svelte/Counter@widget.svelte')
);
const SolidCounter = container(() => import('../solid/Counter@widget.solid'));
const PreactCounter = container(
  () => import('../preact/Counter@widget.preact')
);
const WebComponentCounter = container<{ count?: number }>(
  () => import('../../(components)/WebComponentCounter@widget.wc')
);
const LitCounter = container<{ count?: number }>(
  () => import('../../(components)/LitCounter@widget.lit')
);

export const meta = defineMeta({ title: 'React route' });
export default defineRouteComponent(() => (
  <BaseLayout>
    <PageHeader
      title="React route"
      description="A React route importing a React component, rendered on the server and hydrated in the browser."
    />
    <Section title="Native Widget">
      <Counter count={3} />
    </Section>
    <Section title="Widgets from other frameworks">
      <h3>Vue 3 Widget</h3>
      <Vue3Counter count={3} />
      <h3>Vue 2 Widget</h3>
      <Vue2Counter count={3} />
      <h3>Svelte Widget</h3>
      <SvelteCounter count={3} />
      <h3>Solid Widget</h3>
      <SolidCounter count={3} />
      <h3>Preact Widget</h3>
      <PreactCounter count={3} />
      <h3>Web Components Widget</h3>
      <WebComponentCounter widget={{ clientOnly: true }} count={3} />
      <h3>Lit Widget</h3>
      <LitCounter widget={{ clientOnly: true }} count={3} />
    </Section>
  </BaseLayout>
));
