import './(css)/style.css';
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Styling</h1>
      <p>
        Import plain CSS files to style your routes. The colored boxes below are
        rendered from an imported stylesheet.
      </p>
      <div className="box"></div>
    </BaseLayout>
  );
});
