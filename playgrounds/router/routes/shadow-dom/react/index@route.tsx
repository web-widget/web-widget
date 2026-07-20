import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';
import BaseLayout from '~/routes/(components)/BaseLayout';
import { PageHeader, Section } from '~/routes/(components)/ui';

const ReactCounter = widget(
  () => import('~/routes/(components)/react/Counter@widget'),
  { renderTarget: 'shadow' }
);
const SlotPanel = widget(
  () => import('~/routes/(components)/slots/SlotPanel@widget'),
  { renderTarget: 'shadow' }
);
const Vue3Counter = widget(
  () => import('~/routes/(vue3)/(components)/Vue3Counter@widget.vue'),
  { renderTarget: 'shadow' }
);
const Vue2Counter = widget(
  () => import('~/routes/(vue2)/(components)/Vue2Counter@widget.vue'),
  { renderTarget: 'shadow' }
);
const SvelteCounter = widget(
  () => import('~/routes/(components)/svelte/Counter@widget.svelte'),
  { renderTarget: 'shadow' }
);
const SolidCounter = widget(
  () => import('~/routes/(components)/solid/Counter@widget'),
  { renderTarget: 'shadow' }
);
const PreactCounter = widget(
  () => import('~/routes/(components)/preact/Counter@widget'),
  { renderTarget: 'shadow' }
);
const WebComponentCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/WebComponentCounter@widget.wc'),
  { renderTarget: 'shadow' }
);
const LitCounter = widget<{ count?: number }>(
  () => import('~/routes/(components)/LitCounter@widget.lit'),
  { renderTarget: 'shadow' }
);

export const meta = defineMeta({ title: 'React Shadow DOM route' });

export default defineRouteComponent(() => (
  <BaseLayout>
    <PageHeader
      title="React Shadow DOM route"
      description="A React route rendering imported Widgets into isolated declarative shadow roots."
    />
    <Section title="Native Widget">
      <ReactCounter count={3} />
    </Section>
    <Section title="Native slots">
      <div className="shadow-slot-example">
        <SlotPanel widget={{ id: 'react-slot-panel' }}>
          <h3 className="shadow-slot-title" slot="title">
            React title
          </h3>
          <p className="shadow-slot-content">Projected from React.</p>
          <div slot="actions">
            <ReactCounter count={0} />
          </div>
        </SlotPanel>
      </div>
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
