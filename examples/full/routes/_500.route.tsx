import "./_error.css";
import VueCounter from "../widgets/Counter.widget.vue?as=jsx";

export const fallback = function Page500() {
  return (
    <main>
      <h1>⚠️ 500</h1>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
};
