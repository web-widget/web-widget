import { defineRouteComponent, defineMeta } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout.tsx';

export const meta = defineMeta({
  title: 'About - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>About</h1>
      <p>
        The page you're looking at is purely static HTML, with no client-side
        interactivity needed. Because of that, we don't need to load any
        JavaScript. Try viewing the page's source, or opening the devtools
        network panel and reloading.
      </p>
    </BaseLayout>
  );
});
