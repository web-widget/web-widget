import { defineRouteComponent } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <ReactCounter widget={{ clientOnly: true }} count={3} />
    </BaseLayout>
  );
});
