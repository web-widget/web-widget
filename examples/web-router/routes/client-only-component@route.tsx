import { defineRouteComponent } from "@web-widget/react";
import ReactCounter from "./(components)/Counter@widget";
import BaseLayout from "./(components)/BaseLayout.tsx";

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <ReactCounter renderStage="client" name="React Counter" start={3} />
    </BaseLayout>
  );
});
