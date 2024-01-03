import "./(css)/error.css";
import VueCounter from "@examples/vue3/Counter@widget.vue?as=jsx";
import type { RouteFallbackComponentProps } from "@web-widget/react";

export const fallback = function Page500({
  message,
}: RouteFallbackComponentProps) {
  return (
    <main>
      <h1>⚠️ 500</h1>
      <pre>{message}</pre>
      <VueCounter name="Vue3 Counter" start={3} />
    </main>
  );
};
