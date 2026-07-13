import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import VueModuleCss from './(vue3)/ModuleCss@widget.vue';
import { asReactWidget } from './(vue3)/helpers';

const RVueModuleCss = asReactWidget(VueModuleCss);

export const meta = defineMeta({
  title: 'Vue CSS Modules',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Vue: CSS Modules</h1>
      <p>
        This page verifies that Vue SFC <code>&lt;style module&gt;</code> CSS is
        correctly scoped and applied.
      </p>
      <RVueModuleCss count={3} />
    </BaseLayout>
  );
});
