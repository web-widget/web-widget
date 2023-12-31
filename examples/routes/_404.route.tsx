import "./_css/error.css";
import VueCounter from "@examples/vue3/Counter.widget.vue?as=jsx";

export const fallback = function Page404() {
  return (
    <main>
      <h1>⚠️ 404 NotFound</h1>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
};
