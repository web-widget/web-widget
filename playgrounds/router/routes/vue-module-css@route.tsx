import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';

const RVueModuleCss = widget(() => import('./(vue3)/ModuleCss@widget.vue'));

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
