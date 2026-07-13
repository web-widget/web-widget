import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="React: Server component"
        description="This is the server component of react."
      />
    </BaseLayout>
  );
});
