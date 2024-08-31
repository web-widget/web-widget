import { defineRouteComponent, defineMeta } from '@web-widget/helpers';
import ReactCounter from './(components)/Counter@widget.tsx';
import BaseLayout from './(components)/BaseLayout.tsx';
import VueCounter from './(components)/Counter@widget.vue';
import { toReact } from '@web-widget/vue';

const RVueCounter = toReact(VueCounter);

export const meta = defineMeta({
  title: 'Home - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Welcome to Web Widget.</h1>
      <p>Try to update this message in the ./routes/index@route.tsx file.</p>

      <h2>React</h2>
      <ReactCounter count={0} />

      <h2>Vue</h2>
      <RVueCounter count={0} />
    </BaseLayout>
  );
});
