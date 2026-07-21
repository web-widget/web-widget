import { defineRouteComponent } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';
import BaseLayout from '~/routes/(components)/BaseLayout.tsx';
import { PageHeader } from '~/routes/(components)/ui';

const RApp = widget(() => import('./App@widget.vue'));

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Vue3: Import React and Vue2"
        description="A Vue 3 route that imports and renders React and Vue 2 widgets as nested components."
      />
      <RApp />
    </BaseLayout>
  );
});
