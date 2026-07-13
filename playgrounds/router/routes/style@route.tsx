import './(css)/style.css';
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';
import { PageHeader } from './(components)/ui';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <PageHeader
        title="Styling"
        description="Import plain CSS files to style your routes. The colored boxes below are rendered from an imported stylesheet."
      />
      <div className="box"></div>
    </BaseLayout>
  );
});
