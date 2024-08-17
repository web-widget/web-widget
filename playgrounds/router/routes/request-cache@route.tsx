import { defineRouteComponent } from '@web-widget/react';
import { lifecycleCache } from '@web-widget/helpers/cache';
import BaseLayout from './(components)/BaseLayout.tsx';
import RequestCache from './(components)/RequestCache@widget.tsx';

export default defineRouteComponent(function Page() {
  const cache = lifecycleCache<{ testName: string }>();
  cache.set('testName', 'hello world', true);
  return (
    <BaseLayout>
      <h1>Request cache</h1>
      <RequestCache />
    </BaseLayout>
  );
});
