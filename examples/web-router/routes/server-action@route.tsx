import { defineRouteComponent } from '@web-widget/react';
import BaseLayout from './(components)/BaseLayout.tsx';
import Echo from './(components)/Echo@widget.tsx';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Server action</h1>
      <Echo />
    </BaseLayout>
  );
});
