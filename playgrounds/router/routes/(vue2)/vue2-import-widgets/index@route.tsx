import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../../(components)/BaseLayout.tsx';
import { PageHeader } from '../../(components)/ui';
import App from './App@widget.vue';
import { asReactWidget } from '@web-widget/vue2/adapter';

const RApp = asReactWidget(App);

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Vue2: Import React and Vue3"
        description="A Vue 2 route that imports and renders React and Vue 3 widgets as nested components."
      />
      <RApp />
    </BaseLayout>
  );
});
