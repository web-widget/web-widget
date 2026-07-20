import { defineRouteComponent } from '@web-widget/helpers';
import { widget } from '@web-widget/react/adapter';
import BaseLayout from './(components)/BaseLayout.tsx';
import { PageHeader } from './(components)/ui';

const ReactCounter = widget(() => import('./frameworks/react/Counter@widget'));

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Client only component"
        description="This component is skipped during server-side rendering and only loads in the browser."
      />
      <ReactCounter
        widget={{
          clientOnly: true,
          fallback: (
            <div
              aria-busy="true"
              style={{
                padding: '16px',
                border: '1px dashed #94a3b8',
                color: '#64748b',
              }}>
              Loading client widget...
            </div>
          ),
        }}
        count={3}
      />
    </BaseLayout>
  );
});
