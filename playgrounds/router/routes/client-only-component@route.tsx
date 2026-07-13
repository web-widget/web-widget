import { defineRouteComponent } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <p>
        This component is skipped during server-side rendering and only loads in
        the browser.
      </p>
      <ReactCounter widget={{ clientOnly: true }} count={3} />
    </BaseLayout>
  );
});
