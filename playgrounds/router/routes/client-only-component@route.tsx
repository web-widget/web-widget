import { defineRouteComponent } from '@web-widget/helpers';
import ReactCounter from './frameworks/react/Counter@widget';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader } from './(components)/ui';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Client only component"
        description="This component is skipped during server-side rendering and only loads in the browser."
      />
      <ReactCounter widget={{ clientOnly: true }} count={3} />
    </BaseLayout>
  );
});
