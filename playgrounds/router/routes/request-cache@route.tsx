import { defineRouteComponent } from '@web-widget/helpers';
import { lifecycleCache } from '@web-widget/helpers/cache';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader } from './(components)/ui';
import RequestCache from './(components)/RequestCache@widget.tsx';

export default defineRouteComponent(function Page() {
  const cache = lifecycleCache<{ testName: string }>();
  cache.set('testName', 'hello world', true);
  return (
    <BaseLayout>
      <PageHeader
        title="Request cache"
        description="Duplicate fetches within the same request are automatically deduplicated and cached."
      />
      <RequestCache />
    </BaseLayout>
  );
});
