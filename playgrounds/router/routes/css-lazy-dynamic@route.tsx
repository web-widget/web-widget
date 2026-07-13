import { lazy, Suspense } from 'react';
import { defineMeta, defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout.tsx';
import CssLazyDynamicWidget from './(css-lazy)/CssLazyDynamicWidget@widget';

const LazyCssChunk = lazy(() => import('./(css-lazy)/LazyCssChunk'));

export const meta = defineMeta({
  title: 'CSS lazy dynamic chunk',
});

export default defineRouteComponent(function CssLazyDynamicPage() {
  return (
    <BaseLayout>
      <h1>CSS: Lazy chunk</h1>
      <p>
        The green dashed box below is a <code>React.lazy</code> chunk with its
        own CSS — it is loaded on demand only when rendered.
      </p>
      <Suspense fallback={<p>Loading lazy chunk…</p>}>
        <LazyCssChunk />
      </Suspense>

      <CssLazyDynamicWidget />
    </BaseLayout>
  );
});
