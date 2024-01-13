import ReactCounter from "../(components)/Counter@widget";
import VueCounter from "@examples/web-router-vue3/Counter@widget.vue?as=jsx";
import Vue2Counter from "@examples/web-router-vue2/Counter@widget.vue?as=jsx";
import VanillaCounter from "../(components)/VanillaCounter@widget?as=jsx";

export default function Page() {
  return (
    <div>
      <h2>React component:</h2>
      <ReactCounter name="React Counter" start={3} />

      <h2>Vue3 component:</h2>
      <VueCounter name="Vue3 Counter" start={3} />

      <h2>Vue2 component:</h2>
      <Vue2Counter name="Vue2 Counter" start={3} />

      <h2>Vanilla component:</h2>
      <VanillaCounter name="Vanilla Counter" start={3} />
    </div>
  );
}
