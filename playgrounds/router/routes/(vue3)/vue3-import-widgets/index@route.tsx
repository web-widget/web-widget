import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../../(components)/BaseLayout.tsx';
import App from './App@widget.vue';
import { asReactWidget } from '@web-widget/vue/adapter';

const RApp = asReactWidget(App);

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Vue3: Import React and Vue2</h1>
      <p>
        A Vue 3 route that imports and renders React and Vue 2 widgets as nested
        components.
      </p>
      <RApp />
    </BaseLayout>
  );
});
