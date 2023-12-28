import "./_css/error.css";
import VueCounter from "./(vue3)/Counter.widget.d.vue?as=jsx.js";

export const fallback = function Page404() {
  return (
    <main>
      <h1>⚠️ 404 NotFound</h1>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
};
