import { defineRouteComponent } from '@web-widget/helpers';
import {
  container,
  type WidgetContainerOptions,
} from '@web-widget/react/adapter';
import BaseLayout from './(components)/BaseLayout';
import './(css)/shadow-route.css';
import {
  Card,
  CardGrid,
  CodeBlock,
  PageHeader,
  Section,
} from './(components)/ui';

const shadowMeta = (
  framework: string,
  accent: string,
  includeOwnershipMarker = false
): WidgetContainerOptions['meta'] => ({
  style: [
    {
      id: `shadow-counter-${framework}`,
      content: `
          :host {
            display: block;
            --sk-border: ${accent};
            --sk-shadow: 3px 3px 0 color-mix(in srgb, ${accent} 28%, transparent);
${includeOwnershipMarker ? '            --shadow-dev-css:1;\n' : ''}          }
          button { width: 100%; }
        `,
    },
  ],
});

const ReactCounter = container(
  () => import('./frameworks/react/Counter@widget'),
  {
    renderTarget: 'shadow',
    meta: shadowMeta('react', '#2563eb', true),
  }
);
const Vue3Counter = container(
  () =>
    import('@playgrounds/web-router-vue3/frameworks/vue3/Counter@widget.vue'),
  { renderTarget: 'shadow', meta: shadowMeta('vue3', '#059669') }
);
const Vue2Counter = container(
  () =>
    import('@playgrounds/web-router-vue2/frameworks/vue2/Counter@widget.vue'),
  { renderTarget: 'shadow', meta: shadowMeta('vue2', '#0f766e') }
);
const SvelteCounter = container(
  () => import('./frameworks/svelte/Counter@widget.svelte'),
  { renderTarget: 'shadow', meta: shadowMeta('svelte', '#dc2626') }
);
const SolidCounter = container(
  () => import('./frameworks/solid/Counter@widget'),
  { renderTarget: 'shadow', meta: shadowMeta('solid', '#1d4ed8') }
);
const PreactCounter = container(
  () => import('./frameworks/preact/Counter@widget'),
  { renderTarget: 'shadow', meta: shadowMeta('preact', '#7c3aed') }
);

const examples = [
  ['React', ReactCounter],
  ['Vue 3', Vue3Counter],
  ['Vue 2', Vue2Counter],
  ['Svelte', SvelteCounter],
  ['Solid', SolidCounter],
  ['Preact', PreactCounter],
] as const;

export default defineRouteComponent(function ShadowDomSsrPage() {
  return (
    <BaseLayout>
      <PageHeader
        title="Shadow DOM SSR"
        description="These Widgets opt into Declarative Shadow DOM while the playground default remains light DOM."
      />
      <Section title="Per-Widget render target">
        <span aria-hidden data-shadow-route-css-probe />
        <CodeBlock>{`container(loader, { renderTarget: 'shadow' })`}</CodeBlock>
        <CardGrid>
          {examples.map(([name, Counter]) => (
            <Card key={name} title={name}>
              <Counter count={3} />
            </Card>
          ))}
        </CardGrid>
      </Section>
    </BaseLayout>
  );
});
