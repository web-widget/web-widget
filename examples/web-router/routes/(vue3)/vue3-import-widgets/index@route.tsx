import { defineRouteComponent } from "@web-widget/react";
import BaseLayout from "../../(components)/BaseLayout.tsx";
import App from "./App@widget.vue?as=jsx";
export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Vue3: Import React and Vue2</h1>
      <App />
    </BaseLayout>
  );
});
