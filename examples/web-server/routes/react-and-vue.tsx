import ReactCounter from "../widgets/Counter.tsx";
import VueCounter from "../widgets/CounterVue.ts";
import { Meta } from "@web-widget/react";
import { render } from "@web-widget/react";

export { render };

export const meta: Meta = {
  title: "Hello, Web Widget",
};

export default function Page() {
  return (
    <>
      <h1>Using react and vue together</h1>

      <h2>React component:</h2>
      <ReactCounter client name="React Counter" start={3} />

      <h2>Vue component:</h2>
      <VueCounter client name="Vue3 Counter" start={1} />
    </>
  );
}
