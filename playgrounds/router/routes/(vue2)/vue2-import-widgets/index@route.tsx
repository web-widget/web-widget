import { defineRouteComponent } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import BaseLayout from '../../(components)/BaseLayout.tsx';
import { PageHeader } from '../../(components)/ui';

const RApp = container(() => import('./App@widget.vue'));

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
