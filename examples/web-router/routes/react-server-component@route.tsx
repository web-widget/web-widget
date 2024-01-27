import { defineRouteComponent } from "@web-widget/react";
import BaseLayout from "./(components)/BaseLayout";

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>React: Server component</h1>
      <p>This is the server component of react.</p>
    </BaseLayout>
  );
});
