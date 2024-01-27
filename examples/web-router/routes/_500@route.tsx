import "./(css)/error.css";
import { defineRouteFallbackComponent } from "@web-widget/react";
import VueCounter from "@examples/web-router-vue3/Counter@widget.vue?as=jsx";

export const fallback = defineRouteFallbackComponent(function Page500(ctx) {
  return (
    <main>
      <h1>⚠️ 500</h1>
      <pre>{ctx.message}</pre>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
});
