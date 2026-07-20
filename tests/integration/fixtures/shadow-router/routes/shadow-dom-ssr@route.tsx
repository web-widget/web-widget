import { defineRouteComponent } from '@web-widget/helpers';
import { widget, type WidgetContainerOptions } from '@web-widget/react/adapter';
import '../styles/route.css';

function shadowMeta(framework: string): WidgetContainerOptions['meta'] {
  return {
    style: [
      {
        id: `shadow-counter-${framework}`,
        content: ':host{display:block}',
      },
    ],
  };
}

const ReactCounter = widget(() => import('../widgets/ReactCounter@widget'), {
  renderTarget: 'shadow',
  meta: shadowMeta('react'),
});
const VueCounter = widget(() => import('../widgets/VueCounter@widget.vue'), {
  renderTarget: 'shadow',
  meta: shadowMeta('vue3'),
});

export default defineRouteComponent(function ShadowDomSsrRoute() {
  return (
    <main>
      <span data-shadow-route-css-probe />
      <ReactCounter />
      <VueCounter />
    </main>
  );
});
