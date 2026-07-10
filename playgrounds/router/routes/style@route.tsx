import './(css)/style.css';
import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Styling</h1>
      <div className="box"></div>
    </BaseLayout>
  );
});
