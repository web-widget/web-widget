import "./404.css";
import VueCounter from "../widgets/Counter.widget.vue?as=jsx";

export const fallback = function Page404() {
  return (
    <main>
      <h1>⚠️ 404 NotFound</h1>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
};
