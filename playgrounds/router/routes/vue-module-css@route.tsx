import { defineRouteComponent, defineMeta } from '@web-widget/react';
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
      <h1>Vue SFC CSS Modules</h1>
      <p>
        This page verifies that Vue SFC <code>&lt;style module&gt;</code> CSS is
        correctly collected during SSR dev. The hashed class names in the SSR
        HTML must match the client-side class names.
      </p>
      <RVueModuleCss count={3} />
    </BaseLayout>
  );
});
