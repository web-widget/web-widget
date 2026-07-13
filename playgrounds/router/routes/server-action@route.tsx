import { defineRouteComponent } from '@web-widget/helpers';
import BaseLayout from './(components)/BaseLayout.tsx';
import Echo from './(components)/Echo@widget.tsx';

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Server action</h1>
      <p>
        Call server-side functions directly from client-side interactions
        without writing a separate API endpoint.
      </p>
      <Echo />
    </BaseLayout>
  );
});
