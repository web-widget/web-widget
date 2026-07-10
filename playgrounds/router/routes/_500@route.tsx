import './(css)/error.css';
import { defineRouteFallbackComponent } from '@web-widget/helpers';
import VueCounter from '@playgrounds/web-router-vue3/Counter@widget.vue';
import { asReactWidget } from '@playgrounds/web-router-vue3/helpers';

const RVueCounter = asReactWidget(VueCounter);

export const fallback = defineRouteFallbackComponent(function Page500(ctx) {
  return (
    <main>
      <h1>⚠️ 500</h1>
      <pre>{ctx.message}</pre>
      <RVueCounter count={3} />
    </main>
  );
});
