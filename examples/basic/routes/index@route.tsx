import { defineRouteComponent, defineMeta } from '@web-widget/react';
import ReactCounter from './(components)/Counter@widget.tsx';
import BaseLayout from './(components)/BaseLayout.tsx';
import VueCounter from './(components)/Counter@widget.vue?as=jsx';

export const meta = defineMeta({
  title: 'Home - Web Widget',
});

export default defineRouteComponent(function Page() {
  return (
    <BaseLayout>
      <h1>Welcome to Web Widget.</h1>
      <p>Try to update this message in the ./routes/index@route.tsx file.</p>

      <h2>React</h2>
      <ReactCounter name="React Counter" start={0} />

      <h2>Vue</h2>
      <VueCounter name="Vue3 Counter" start={0} />
    </BaseLayout>
  );
});
