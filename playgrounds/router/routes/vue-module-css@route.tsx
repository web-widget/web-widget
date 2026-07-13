import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';
import VueModuleCss from './(vue3)/ModuleCss@widget.vue';
import { asReactWidget } from './(vue3)/helpers';

const RVueModuleCss = asReactWidget(VueModuleCss);

export const meta = defineMeta({
  title: 'Vue CSS Modules',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Vue: CSS Modules"
        description={
          <>
            This page verifies that Vue SFC <code>&lt;style module&gt;</code>{' '}
            CSS is correctly scoped and applied.
          </>
        }
      />
      <RVueModuleCss count={3} />
    </BaseLayout>
  );
});
