import ReactCounter from "./(components)/Counter@widget";
import VueCounter from "@examples/vue3/Counter@widget.vue?as=jsx";
import Vue2Counter from "@examples/vue2/Counter@widget.vue?as=jsx";
import VanillaCounter from "./(components)/VanillaCounter@widget?as=jsx";
import type { Meta } from "@web-widget/react";
import BaseLayout from "./(components)/BaseLayout.tsx";

export const meta: Meta = {
  title: "Hello, Web Widget",
};

export default function Page() {
  return (
    <BaseLayout>
      <h1>Using react and vue together</h1>

      <h2>React component:</h2>
      <ReactCounter name="React Counter" start={3} />

      <h2>Vue3 component:</h2>
      <VueCounter name="Vue3 Counter" start={3} />

      <h2>Vue2 component:</h2>
      <Vue2Counter name="Vue2 Counter" start={3} />

      <h2>Vanilla component:</h2>
      <VanillaCounter name="Vanilla Counter" start={3} />
    </BaseLayout>
  );
}
