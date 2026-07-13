import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from '../(components)/BaseLayout.tsx';
import { PageHeader } from '../(components)/ui';
import Echo from './Echo@widget.tsx';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Server action"
        description="Call server-side functions directly from client-side interactions without writing a separate API endpoint."
      />
      <Echo />
    </BaseLayout>
  );
});
