import { lazy, Suspense } from 'react';
import { defineMeta, defineRouteComponent } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout.tsx';
import CssLazyDynamicWidget from './(css-lazy)/CssLazyDynamicWidget@widget';

const LazyCssChunk = lazy(() => import('./(css-lazy)/LazyCssChunk'));

export const meta = defineMeta({
  title: 'CSS lazy dynamic chunk',
});

export default defineRouteComponent(function CssLazyDynamicPage() {
  return (
    <BaseLayout>
      <h1>CSS + dynamic import</h1>
      <p>
        The green dashed box below is a <code>React.lazy</code> chunk on the{' '}
        <strong>route</strong> that imports <code>lazy-chunk.css</code>.
        Route-level meta keeps conservative CSS linking, so SSR should still
        include that stylesheet in head when needed.
      </p>
      <Suspense fallback={<p>Loading lazy chunk…</p>}>
        <LazyCssChunk />
      </Suspense>

      <hr style={{ margin: '2rem 0' }} />

      <CssLazyDynamicWidget />
    </BaseLayout>
  );
});
