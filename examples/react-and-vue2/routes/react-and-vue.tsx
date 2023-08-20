import ReactCounter from "../widgets/Counter.tsx";
import VueCounter from "../widgets/Counter.vue";
import CounterVanilla from "../widgets/CounterVanilla.ts";
import type { Meta } from "@web-widget/react";
import BaseLayout from "../components/BaseLayout.tsx";

export const meta: Meta = {
  title: "Hello, Web Widget",
};

export default function Page() {
  return (
    <BaseLayout>
      <h1>Using react and vue together</h1>

      <h2>React component:</h2>
      <CounterVanilla name="Vanilla Counter" start={3} />

      <h2>Vue component:</h2>
      <VueCounter name="Vue3 Counter" start={3} />

      <h2>Vanilla component:</h2>
      <ReactCounter name="Vanilla Counter" start={3} />
    </BaseLayout>
  );
}
