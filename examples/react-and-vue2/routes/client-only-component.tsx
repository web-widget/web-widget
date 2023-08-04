import VueCounter from "../widgets/CounterVue.ts";
import { render } from "@web-widget/react";
import BaseLayout from "../components/BaseLayout.tsx";

export { render };

export default function Page() {
  return (
    <BaseLayout>
      <h1>Client only component</h1>
      <VueCounter clientOnly name="React Counter" start={3} />
    </BaseLayout>
  );
}
