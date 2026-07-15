import { defineRouteComponent } from '@web-widget/helpers';
import { container } from '@web-widget/react/adapter';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader } from './(components)/ui';

const ReactCounter = container(
  () => import('./frameworks/react/Counter@widget')
);

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
